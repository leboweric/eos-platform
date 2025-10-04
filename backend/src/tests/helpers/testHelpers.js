import request from 'supertest';
import app from '../../server.js';
import db from '../../config/database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Data Generators
 */
export const testData = {
  // Generate unique test email
  generateEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
  
  // Generate unique organization name
  generateOrgName: () => `Test Org ${Date.now()}`,
  
  // Generate test user data
  generateUser: () => ({
    email: testData.generateEmail(),
    password: 'TestPassword123!',
    name: `Test User ${Date.now()}`,
    role: 'admin'
  }),
  
  // Generate test team data
  generateTeam: () => ({
    name: `Test Team ${Date.now()}`,
    description: 'Test team description',
    is_leadership_team: false
  }),
  
  // Generate test priority data
  generatePriority: () => ({
    title: `Test Priority ${Date.now()}`,
    description: 'Test priority description',
    quarter: 'Q1',
    year: new Date().getFullYear(),
    status: 'on_track',
    owner: 'Test Owner'
  })
};

/**
 * Database Helper Functions
 */
export const dbHelpers = {
  // Create a test organization
  createTestOrganization: async () => {
    const orgId = uuidv4();
    const result = await db.query(
      `INSERT INTO organizations (id, name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [orgId, testData.generateOrgName()]
    );
    return result.rows[0];
  },
  
  // Create a test user
  createTestUser: async (organizationId = null) => {
    const userId = uuidv4();
    const userData = testData.generateUser();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, name, organization_id, first_name, last_name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, name, organization_id`,
      [userId, userData.email, hashedPassword, userData.name, organizationId, 'Test', 'User', 'admin']
    );
    
    const user = result.rows[0];
    
    // Link user to organization if provided
    if (organizationId) {
      // Check if user_organizations table exists before trying to insert
      try {
        await db.query(
          `INSERT INTO user_organizations (user_id, organization_id, role, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [user.id, organizationId, 'admin']
        );
      } catch (err) {
        // Table might not exist in simplified test schema
      }
    }
    
    // Return user with original password for testing
    return { ...user, password: userData.password };
  },
  
  // Create a test team
  createTestTeam: async (organizationId) => {
    const teamId = uuidv4();
    const teamData = testData.generateTeam();
    
    const result = await db.query(
      `INSERT INTO teams (id, name, description, organization_id, is_leadership_team, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [teamId, teamData.name, teamData.description, organizationId, teamData.is_leadership_team]
    );
    
    return result.rows[0];
  },
  
  // Clean up test data
  cleanupTestData: async (organizationId) => {
    try {
      // Delete in order of dependencies - only delete what exists
      const tables = [
        'quarterly_priorities',
        'todos', 
        'issues',
        'scorecard_scores',
        'scorecard_metrics',
        'teams',
        'user_organizations'
      ];
      
      for (const table of tables) {
        try {
          await db.query(`DELETE FROM ${table} WHERE organization_id = $1`, [organizationId]);
        } catch (err) {
          // Table might not have organization_id column, skip it
        }
      }
      
      await db.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  },
  
  // Clean up test user
  cleanupTestUser: async (userId) => {
    try {
      await db.query('DELETE FROM user_organizations WHERE user_id = $1', [userId]);
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
    } catch (error) {
      console.error('User cleanup failed:', error);
    }
  }
};

/**
 * API Request Helpers
 */
export const apiHelpers = {
  // Login and get auth token
  loginUser: async (email, password) => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body.error}`);
    }
    
    return {
      token: response.body.data.accessToken,
      refreshToken: response.body.data.refreshToken,
      user: response.body.data.user
    };
  },
  
  // Create authenticated request
  authenticatedRequest: (token) => {
    return {
      get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
      post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
      put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
      delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
      patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`)
    };
  },
  
  // Register a new user and organization
  registerUserAndOrg: async () => {
    const userData = testData.generateUser();
    const orgName = testData.generateOrgName();
    
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        organizationName: orgName
      });
    
    if (response.status !== 201) {
      throw new Error(`Registration failed: ${response.body.error}`);
    }
    
    return {
      token: response.body.data.accessToken,
      user: response.body.data.user,
      organization: { name: orgName, id: response.body.data.user.organization_id }
    };
  }
};

/**
 * Assertion Helpers
 */
export const assertHelpers = {
  // Assert successful response
  assertSuccess: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('data');
    return response.body.data;
  },
  
  // Assert error response
  assertError: (response, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    return response.body.error;
  },
  
  // Assert pagination
  assertPagination: (response) => {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
  }
};

/**
 * Utility Functions
 */
export const utils = {
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random string
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  // Deep clone object
  deepClone: (obj) => JSON.parse(JSON.stringify(obj))
};

// Export everything as default as well for convenience
export default {
  testData,
  dbHelpers,
  apiHelpers,
  assertHelpers,
  utils
};