import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import teamRoutes from './routes/teams.js';
import vtoRoutes from './routes/vto.js';
import rocksRoutes from './routes/rocks.js';
import scorecardRoutes from './routes/scorecard.js';
import meetingRoutes from './routes/meetings.js';
import todoRoutes from './routes/todos.js';
import issueRoutes from './routes/issues.js';
import departmentRoutes from './routes/departmentRoutes.js';
import accountabilityRoutes from './routes/accountabilityRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Import jobs
import { initializeSubscriptionJobs } from './jobs/subscriptionJobs.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', true);

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