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
import businessBlueprintRoutes from './routes/businessBlueprint.js';
import quarterlyPrioritiesRoutes from './routes/quarterlyPriorities.js';
import scorecardRoutes from './routes/scorecard.js';
import meetingRoutes from './routes/meetings.js';
import todoRoutes from './routes/todos.js';
import issueRoutes from './routes/issues.js';
import departmentRoutes from './routes/departmentRoutes.js';
import accountabilityRoutes from './routes/accountabilityRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consultantRoutes from './routes/consultantRoutes.js';
import organizationalChartRoutes from './routes/organizationalChart.js';
import skillsRoutes from './routes/skills.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

// Import jobs
import { initializeSubscriptionJobs } from './jobs/subscriptionJobs.js';

// Import utilities
import { ensureUploadsDirectory } from './utils/ensureUploadsDirectory.js';

// Load environment variables
dotenv.config();

// Ensure uploads directory exists
ensureUploadsDirectory();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Different rate limits for different endpoints
const createLimiter = (windowMs, max) => rateLimit({
  windowMs,
  max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

// General API limiter - much more lenient for normal usage
const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300 // 300 requests per minute
);

// Strict limiter for auth endpoints
const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  20 // 20 auth requests per 15 minutes
);

// Very lenient limiter for read operations
const readLimiter = createLimiter(
  1 * 60 * 1000, // 1 minute
  100 // 100 requests per minute
);

// Logo endpoint specific limiter (these requests are frequent)
const logoLimiter = createLimiter(
  1 * 60 * 1000, // 1 minute
  200 // 200 requests per minute
);

// Middleware
app.use(helmet());

// Configure CORS to accept multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://eos-platform.netlify.app',
  'https://42vibes.com',
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🔒 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-impersonated-org-id'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
// Apply general limiter to all API routes by default
app.use('/api/', generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes with specific rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations/:orgId/users', userRoutes); // For org-scoped user operations
// Apply logo limiter to logo endpoints specifically
app.use('/api/v1/organizations/:orgId/logo', logoLimiter);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/organizations/:orgId/teams', teamRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/business-blueprint', businessBlueprintRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/quarterly-priorities', quarterlyPrioritiesRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/scorecard', scorecardRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/meetings', meetingRoutes);
app.use('/api/v1/organizations/:orgId/todos', todoRoutes);
app.use('/api/v1/organizations/:orgId/issues', issueRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/accountability', accountabilityRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/consultant', consultantRoutes);
app.use('/api/v1/organizations/:orgId/organizational-charts', organizationalChartRoutes);
app.use('/api/v1/organizations/:orgId/skills', skillsRoutes);

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