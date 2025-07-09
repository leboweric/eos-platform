const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const organizationRoutes = require('./routes/organizations');
const teamRoutes = require('./routes/teams');
const vtoRoutes = require('./routes/vto');
const rocksRoutes = require('./routes/rocks');
const scorecardRoutes = require('./routes/scorecard');
const meetingRoutes = require('./routes/meetings');
const todoRoutes = require('./routes/todos');
const issueRoutes = require('./routes/issues');
const departmentRoutes = require('./routes/departmentRoutes');
const accountabilityRoutes = require('./routes/accountabilityRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');

// Import jobs
const { initializeSubscriptionJobs } = require('./jobs/subscriptionJobs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/organizations/:orgId/teams', teamRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/vto', vtoRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/rocks', rocksRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/scorecard', scorecardRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/meetings', meetingRoutes);
app.use('/api/v1/organizations/:orgId/todos', todoRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/issues', issueRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/accountability', accountabilityRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);

// Webhook routes (must be before express.json() middleware for raw body)
app.use('/webhooks', webhookRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize cron jobs
initializeSubscriptionJobs();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

