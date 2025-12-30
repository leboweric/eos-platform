import pkg from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { wrapQueryWithMetrics } from '../middleware/queryMetrics.js';

dotenv.config();

const { Pool } = pkg;

// Database configuration
// In production (Railway), always use their DATABASE_URL
// In test mode, always use DATABASE_URL (which is set to TEST_DATABASE_URL in tests)
// Locally, only use DATABASE_URL if explicitly set and not localhost
const isLocalDatabase = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');
const useProductionDB = process.env.NODE_ENV === 'production' || 
                       process.env.NODE_ENV === 'test' || 
                       (process.env.DATABASE_URL && !isLocalDatabase);

const dbConfig = useProductionDB
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // SSL only for production, not tests
      max: process.env.NODE_ENV === 'test' ? 5 : 10, // reduced pool size for tests and Railway
      idleTimeoutMillis: 10000, // close idle connections after 10 seconds
      connectionTimeoutMillis: 5000, // increased timeout for Railway
      // Railway-specific optimizations (not needed for tests)
      keepAlive: process.env.NODE_ENV !== 'test',
      keepAliveInitialDelayMillis: process.env.NODE_ENV !== 'test' ? 10000 : undefined,
      // Handle connection drops gracefully
      allowExitOnIdle: true,
      // Retry logic
      query_timeout: 10000,
      statement_timeout: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'eos_platform',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

// Create connection pool
const pool = new Pool(dbConfig);

// Wrap pool with query metrics tracking (preserves all pool methods)
wrapQueryWithMetrics(pool);

// Test database connection (log only once on startup, only in debug mode)
let hasLoggedConnection = false;
pool.on('connect', () => {
  if (!hasLoggedConnection && process.env.LOG_LEVEL === 'debug') {
    logger.debug('📊 Connected to PostgreSQL database');
    hasLoggedConnection = true;
  }
});

pool.on('error', (err, client) => {
  logger.error('❌ Database connection error:', err);
  // Don't exit on connection errors - let the pool handle reconnection
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.warn('🔄 Database connection lost, pool will reconnect automatically');
  } else if (err.code === 'ECONNREFUSED') {
    logger.error('❌ Database connection refused - check if database is running');
  }
});

// Helper function to execute queries with retry logic
export const query = async (text, params, retries = 2) => {
  const start = Date.now();
  
  // Log all meeting history queries for debugging
  if (text.includes('meeting_snapshots')) {
    logger.info('📋 MEETING HISTORY QUERY DEBUG:');
    logger.info('Query text:', text);
    logger.info('Parameters:', params);
    logger.info('Parameter types:', params?.map(p => typeof p));
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Track query metrics for observability
      if (duration > 500) {
        const endpoint = global.currentRequestPath || 'unknown';
        const organizationId = global.currentOrganizationId || null;
        // Use dynamic import to avoid circular dependency
        import('../services/observabilityService.js').then(({ default: observabilityService }) => {
          observabilityService.trackQuery(text, duration, endpoint, organizationId);
        }).catch(() => {
          // Silently fail if observability service is not available
        });
      }
      
      // Only log slow queries (> 1000ms) in production
      if (duration > 1000) {
        logger.warn('⚠️ Slow query detected:', { duration: `${duration}ms`, text: text.substring(0, 100), rows: res.rowCount });
      } else {
        logger.debug('Query executed:', { duration: `${duration}ms`, text: text.substring(0, 50), rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      logger.error(`❌ Query error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
      
      // Log detailed error info for meeting queries
      if (text.includes('meeting_snapshots')) {
        logger.error('🔴 MEETING QUERY ERROR DETAILS:');
        logger.error('Error code:', error.code);
        logger.error('Error detail:', error.detail);
        logger.error('Error hint:', error.hint);
        logger.error('Error position:', error.position);
        logger.error('Error where:', error.where);
        logger.error('Full query that failed:', text);
        logger.error('Parameters that failed:', params);
      }
      
      // Check if it's a connection error and we have retries left
      if (attempt < retries && 
          (error.code === 'ECONNREFUSED' || 
           error.code === 'EPIPE' || 
           error.message.includes('Connection terminated') ||
           error.message.includes('terminating connection'))) {
        logger.warn(`🔄 Retrying query in ${(attempt + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }
      
      throw error;
    }
  }
};

// Helper function to get a client from the pool
export const getClient = async () => {
  return await pool.connect();
};

// Helper function to begin transaction
export const beginTransaction = async () => {
  const client = await getClient();
  await client.query('BEGIN');
  return client;
};

// Helper function to commit transaction
export const commitTransaction = async (client) => {
  await client.query("COMMIT");
};

// Helper function to rollback transaction
export const rollbackTransaction = async (client) => {
  await client.query("ROLLBACK");
};

// Named export for pool direct access
export { pool };

// Default export for backward compatibility
export default {
  query,
  pool,
  getClient,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};

