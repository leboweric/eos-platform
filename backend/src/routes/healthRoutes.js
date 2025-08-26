import express from 'express';
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
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