import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Enhanced health check endpoint for uptime monitoring
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const result = await db.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7) || 'dev'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
});

// Root endpoint - return API info instead of 404
router.get('/', (req, res) => {
  res.json({ 
    name: 'AXP API',
    version: '1.0.0',
    status: 'operational',
    documentation: 'https://axplatform.app/docs'
  });
});

// Security.txt endpoint (for security researchers)
router.get('/security.txt', (req, res) => {
  res.type('text/plain');
  res.send(`Contact: security@axplatform.app
Preferred-Languages: en
Canonical: https://api.axplatform.app/security.txt`);
});

// Favicon - return empty response instead of error
router.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

export default router;