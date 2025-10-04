import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { testData, dbHelpers } from '../helpers/testHelpers.js';
import db from '../../config/database.js';

describe('User Registration', () => {
  let createdUserId = null;
  let createdOrgId = null;

  // Clean up after each test
  afterEach(async () => {
    if (createdOrgId) {
      await dbHelpers.cleanupTestData(createdOrgId);
      createdOrgId = null;
    }
    if (createdUserId) {
      await dbHelpers.cleanupTestUser(createdUserId);
      createdUserId = null;
    }
  });

  it('should register a new user with valid data', async () => {
    const userData = {
      email: testData.generateEmail(),
      password: 'StrongPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: testData.generateOrgName()
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    // Check response structure
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');

    // Check user object
    const { user } = response.body.data;
    expect(user).toHaveProperty('email', userData.email);
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('organizationId'); // API returns camelCase
    
    // Ensure password_hash is NOT in response
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('password_hash');

    // Store IDs for cleanup
    createdUserId = user.id;
    createdOrgId = user.organizationId;

    // Verify user was actually created in database
    const dbResult = await db.query(
      'SELECT id, email FROM users WHERE id = $1',
      [user.id]
    );
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].email).toBe(userData.email);
  });

  it('should reject registration with weak password', async () => {
    const userData = {
      email: testData.generateEmail(),
      password: '123', // Weak password
      firstName: 'Test',
      lastName: 'User',
      organizationName: testData.generateOrgName()
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(400);

    // Check error response - API returns generic "Validation failed"
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('validation');
    
    // Verify user was NOT created
    const dbResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [userData.email]
    );
    expect(dbResult.rows).toHaveLength(0);
  });

  it('should reject registration with duplicate email', async () => {
    const userData = {
      email: testData.generateEmail(),
      password: 'StrongPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: testData.generateOrgName()
    };

    // First registration should succeed
    const firstResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    // Store IDs for cleanup
    createdUserId = firstResponse.body.data.user.id;
    createdOrgId = firstResponse.body.data.user.organizationId;

    // Second registration with same email should fail
    const secondResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...userData,
        organizationName: testData.generateOrgName() // Different org name
      })
      .expect(409);

    // Check error message
    expect(secondResponse.body).toHaveProperty('error');
    expect(secondResponse.body.error.toLowerCase()).toContain('already exists');
  });

  it('should reject registration with invalid email format', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'StrongPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: testData.generateOrgName()
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('validation');
  });

  it('should reject registration with missing required fields', async () => {
    const userData = {
      email: testData.generateEmail(),
      // Missing password and organizationName
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should create organization with user as admin', async () => {
    const userData = {
      email: testData.generateEmail(),
      password: 'StrongPassword123!',
      firstName: 'Test',
      lastName: 'User',
      organizationName: testData.generateOrgName()
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    const { user } = response.body.data;
    createdUserId = user.id;
    createdOrgId = user.organizationId;

    // Verify organization was created
    const orgResult = await db.query(
      'SELECT id, name FROM organizations WHERE id = $1',
      [createdOrgId]
    );
    expect(orgResult.rows).toHaveLength(1);
    expect(orgResult.rows[0].name).toBe(userData.organizationName);

    // Verify user is admin of organization (checking team_members, not user_organizations)
    const roleResult = await db.query(
      `SELECT tm.role FROM team_members tm 
       JOIN teams t ON tm.team_id = t.id 
       WHERE tm.user_id = $1 AND t.organization_id = $2 AND t.is_leadership_team = true`,
      [user.id, createdOrgId]
    );
    expect(roleResult.rows).toHaveLength(1);
    expect(roleResult.rows[0].role).toBe('admin');
  });
});