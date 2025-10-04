import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables first
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure we're using the test database
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  console.log('🔧 Using TEST_DATABASE_URL for tests:', process.env.TEST_DATABASE_URL);
} else {
  console.warn('⚠️  TEST_DATABASE_URL not set, using default DATABASE_URL:', process.env.DATABASE_URL);
}

console.log('🔍 Final DATABASE_URL:', process.env.DATABASE_URL);
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

// Global variable to hold database connection
let db;

// Database setup and teardown
beforeAll(async () => {
  console.log('🧪 Setting up test database...');
  
  // Dynamically import database after environment is configured
  const dbModule = await import('../config/database.js');
  db = dbModule.default;
  
  // You can add database migration or seed data here if needed
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test database...');
  
  // Clean up test data
  try {
    // Add cleanup queries here if needed
    // For example:
    // await db.query('DELETE FROM test_organizations WHERE email LIKE $1', ['%@test.%']);
    
    // Close database connection
    if (db) {
      await db.end();
    }
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
  }
});

// Reset any mocks or test state between tests
beforeEach(() => {
  // Reset any global mocks or state here
});

afterEach(() => {
  // Clean up after each test
});

// Global test utilities
global.testHelpers = {
  // Add any global test helpers here
  generateTestEmail: () => `test-${Date.now()}@test.com`,
  generateTestOrgName: () => `Test Org ${Date.now()}`,
  
  // Helper to create auth headers
  getAuthHeaders: (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }),
  
  // Helper to wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Suppress console output during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: () => {},
    info: () => {},
    warn: () => {},
    error: console.error, // Keep error logs
  };
}