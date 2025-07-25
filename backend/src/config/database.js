import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Database configuration
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // reduced pool size for Railway
      idleTimeoutMillis: 10000, // close idle connections after 10 seconds
      connectionTimeoutMillis: 5000, // increased timeout for Railway
      // Railway-specific optimizations
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
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

// Test database connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
  console.error('❌ Database connection error:', err);
  // Don't exit on connection errors - let the pool handle reconnection
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Database connection lost, pool will reconnect automatically');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('❌ Database connection refused - check if database is running');
  }
});

// Helper function to execute queries with retry logic
export const query = async (text, params, retries = 2) => {
  const start = Date.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('📊 Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error(`❌ Query error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
      
      // Check if it's a connection error and we have retries left
      if (attempt < retries && 
          (error.code === 'ECONNREFUSED' || 
           error.code === 'EPIPE' || 
           error.message.includes('Connection terminated') ||
           error.message.includes('terminating connection'))) {
        console.log(`🔄 Retrying query in ${(attempt + 1) * 1000}ms...`);
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
  await client.query('COMMIT');
  client.release();
};

// Helper function to rollback transaction
export const rollbackTransaction = async (client) => {
  await client.query('ROLLBACK');
  client.release();
};

export default pool;

