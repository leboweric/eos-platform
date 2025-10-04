import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../server.js';
import { testData, dbHelpers } from '../helpers/testHelpers.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../../config/database.js';
import * as emailService from '../../services/emailService.js';

// Mock the email service to prevent actual emails
vi.mock('../../services/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetConfirmation: vi.fn().mockResolvedValue({ success: true })
}));

describe('Password Reset', () => {
  let testUser = null;
  let testOrg = null;
  let testPassword = 'OldPassword123!';
  let newPassword = 'NewPassword456!';

  // Create a test user before each test
  beforeEach(async () => {
    // Clear any existing mocks
    vi.clearAllMocks();
    
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
  });

  // Clean up after each test
  afterEach(async () => {
    // Clean up any reset tokens
    if (testUser) {
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [testUser.id]);
    }
    
    if (testOrg) {
      await dbHelpers.cleanupTestData(testOrg.id);
    }
    if (testUser) {
      await dbHelpers.cleanupTestUser(testUser.id);
    }
  });

  it('should send password reset email with valid token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: testUser.email
      })
      .expect(200);

    // Check response
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message.toLowerCase()).toContain('reset link');

    // Verify reset token was created in database
    const tokenResult = await db.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND used = false',
      [testUser.id]
    );
    
    expect(tokenResult.rows).toHaveLength(1);
    expect(tokenResult.rows[0]).toHaveProperty('token');
    expect(tokenResult.rows[0]).toHaveProperty('expires_at');
    expect(tokenResult.rows[0].used).toBe(false);
    
    // Check that token expires in the future
    const expiresAt = new Date(tokenResult.rows[0].expires_at);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify email service was called
    expect(emailService.sendEmail).toHaveBeenCalled();
  });

  it('should reset password with valid token', async () => {
    // Generate a reset token manually (since we can't intercept the email)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Insert the token into database
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES ($1, $2, $3, $4)',
      [testUser.id, hashedToken, expiresAt, false]
    );

    // Reset password with token
    const resetResponse = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: newPassword
      })
      .expect(200);

    expect(resetResponse.body).toHaveProperty('success', true);
    expect(resetResponse.body).toHaveProperty('message');
    expect(resetResponse.body.message.toLowerCase()).toContain('password');

    // Verify can login with new password
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: newPassword
      })
      .expect(200);

    expect(loginResponse.body).toHaveProperty('success', true);
    expect(loginResponse.body.data).toHaveProperty('accessToken');

    // Verify cannot login with old password
    const oldLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testPassword
      })
      .expect(401);

    expect(oldLoginResponse.body).toHaveProperty('error');
  });

  it('should reject expired reset token', async () => {
    // Create an expired token (1 hour ago)
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(expiredToken).digest('hex');
    
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, used)
       VALUES ($1, $2, $3, $4)`,
      [
        testUser.id,
        hashedToken,
        new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        false
      ]
    );

    // Try to reset password with expired token
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: expiredToken,
        password: newPassword
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('expired');
  });

  it('should reject invalid reset token', async () => {
    // Try to reset with fake token
    const fakeToken = 'invalid-token-12345';
    
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: fakeToken,
        password: newPassword
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('invalid');
  });

  it('should invalidate token after successful reset', async () => {
    // Generate a reset token manually
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Insert the token into database
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, used) VALUES ($1, $2, $3, $4)',
      [testUser.id, hashedToken, expiresAt, false]
    );

    // Successfully reset password
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: newPassword
      })
      .expect(200);

    // Try to use same token again
    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'AnotherPassword789!'
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.toLowerCase()).toContain('invalid');

    // Verify token is marked as used in database
    const usedTokenResult = await db.query(
      'SELECT used FROM password_reset_tokens WHERE token = $1',
      [hashedToken]
    );
    
    if (usedTokenResult.rows.length > 0) {
      expect(usedTokenResult.rows[0].used).toBe(true);
    }
  });

  it('should handle non-existent email gracefully', async () => {
    // Request password reset for non-existent email
    const response = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'nonexistent@example.com'
      })
      .expect(200); // Should return 200 for security reasons

    // Check response - should not reveal if email exists
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message.toLowerCase()).toContain('email');

    // Verify no token was created
    const tokenResult = await db.query(
      'SELECT * FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      ['nonexistent@example.com']
    );
    
    expect(tokenResult.rows).toHaveLength(0);
  });
});