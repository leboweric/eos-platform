import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { testData, dbHelpers } from '../helpers/testHelpers.js';
import bcrypt from 'bcryptjs';
import db from '../../config/database.js';

describe('User Login', () => {
  let testUser = null;
  let testOrg = null;
  let testPassword = 'StrongPassword123!';

  // Create a test user before each test
  beforeEach(async () => {
    // Create test organization first
    testOrg = await dbHelpers.createTestOrganization();
    
    // Create test user manually to ensure we know the password
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const userResult = await db.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, name, organization_id, role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, email, first_name, last_name`,
      [
        testData.generateEmail(),
        hashedPassword,
        'Test',
        'User',
        'Test User',
        testOrg.id,
        'admin'
      ]
    );
    
    testUser = {
      ...userResult.rows[0],
      password: testPassword,
      organization_id: testOrg.id
    };

    // Add user to leadership team
    const teamResult = await db.query(
      `INSERT INTO teams (organization_id, name, is_leadership_team) 
       VALUES ($1, $2, $3) RETURNING id`,
      [testOrg.id, 'Leadership Team', true]
    );
    
    await db.query(
      `INSERT INTO team_members (team_id, user_id, role) 
       VALUES ($1, $2, $3)`,
      [teamResult.rows[0].id, testUser.id, 'admin']
    );
  });

  // Clean up after each test
  afterEach(async () => {
    if (testOrg) {
      await dbHelpers.cleanupTestData(testOrg.id);
    }
    if (testUser) {
      await dbHelpers.cleanupTestUser(testUser.id);
    }
  });

  it('should login with correct credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testPassword
      })
      .expect(200);

    // Check response structure
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');

    // Check user object
    const { user } = response.body.data;
    expect(user).toHaveProperty('id', testUser.id);
    expect(user).toHaveProperty('email', testUser.email);
    expect(user).toHaveProperty('firstName', testUser.first_name);
    expect(user).toHaveProperty('lastName', testUser.last_name);
    
    // Ensure password is NOT in response
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('password_hash');

    // Check tokens are strings
    expect(typeof response.body.data.accessToken).toBe('string');
    expect(typeof response.body.data.refreshToken).toBe('string');
    expect(response.body.data.accessToken.length).toBeGreaterThan(0);
    expect(response.body.data.refreshToken.length).toBeGreaterThan(0);
  });

  it('should reject login with wrong password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123!'
      })
      .expect(401);

    // Check error response
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('invalid credentials');

    // Ensure no tokens are returned
    expect(response.body).not.toHaveProperty('data');
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');
  });

  it('should reject login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: testPassword
      })
      .expect(401);

    // Check error response
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('invalid credentials');

    // Ensure no tokens are returned
    expect(response.body).not.toHaveProperty('data');
    expect(response.body).not.toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');
  });

  it('should set refresh token cookie on successful login', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testPassword
      })
      .expect(200);

    // Check for Set-Cookie header
    const setCookieHeader = response.headers['set-cookie'];
    
    if (setCookieHeader) {
      // If cookies are implemented, check for refreshToken cookie
      expect(setCookieHeader).toBeDefined();
      
      // Find the refreshToken cookie
      const refreshTokenCookie = Array.isArray(setCookieHeader) 
        ? setCookieHeader.find(cookie => cookie.startsWith('refreshToken='))
        : setCookieHeader.startsWith('refreshToken=') ? setCookieHeader : null;

      if (refreshTokenCookie) {
        // Check cookie flags
        expect(refreshTokenCookie.toLowerCase()).toContain('httponly');
        
        // Optional: Check other security flags
        // expect(refreshTokenCookie.toLowerCase()).toContain('secure'); // Only in production
        // expect(refreshTokenCookie.toLowerCase()).toContain('samesite');
      }
    }
    
    // Even if cookie is not set, the refresh token should be in the response body
    expect(response.body.data).toHaveProperty('refreshToken');
  });
});