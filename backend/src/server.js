import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

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
import headlinesRoutes from './routes/headlines.js';
import departmentRoutes from './routes/departmentRoutes.js';
import accountabilityRoutes from './routes/accountabilityRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import subscriptionRoutesV2 from './routes/subscriptionRoutesV2.js';
import webhookRoutes from './routes/webhookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consultantRoutes from './routes/consultantRoutes.js';
import organizationalChartRoutes from './routes/organizationalChart.js';
import skillsRoutes from './routes/skills.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import documentsRoutes from './routes/documents.js';
import foldersRoutes from './routes/folders.js';
import storageRoutes from './routes/storage.js';
import aiRockAssistantRoutes from './routes/aiRockAssistant.js';
import cascadingMessagesRoutes from './routes/cascadingMessages.js';
import completionTrackingRoutes from './routes/completionTracking.js';
import userPreferencesRoutes from './routes/userPreferences.js';
import demoResetRoutes from './routes/demoReset.js';
import sharedMetricsRoutes from './routes/sharedMetrics.js';
import terminologyRoutes from './routes/terminology.js';
import oauthRoutes from './routes/oauth.js';
import exportRoutes from './routes/export.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { checkTrialStatus, checkTrialReminders } from './middleware/trialCheck.js';

// Import jobs
import { initializeSubscriptionJobs } from './jobs/subscriptionJobs.js';

// Import utilities
import { ensureUploadsDirectory } from './utils/ensureUploadsDirectory.js';

// Import WebSocket service
import meetingSocketService from './services/meetingSocketService.js';

// Load environment variables
dotenv.config();

// Ensure uploads directory exists
ensureUploadsDirectory();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway deployment
app.set('trust proxy', true);

// Different rate limits for different endpoints
const createLimiter = (windowMs, max, skipAuth = false) => rateLimit({
  windowMs,
  max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use a combination of IP and user ID for authenticated users
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // For authenticated users, use IP + a portion of token to allow more requests
      return `${ip}:auth`;
    }
    return ip;
  },
  skip: skipAuth ? (req) => {
    // Skip rate limiting for authenticated users if skipAuth is true
    const authHeader = req.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ');
  } : undefined
});

// General API limiter - much more lenient for normal usage
const generalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 minute
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000 // 1000 requests per minute (increased from 300)
);

// More lenient limiter for auth endpoints
const authLimiter = createLimiter(
  5 * 60 * 1000, // 5 minutes (reduced from 15)
  500 // 500 auth requests per 5 minutes (greatly increased for token refresh)
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
  'https://axplatform.app',
  'https://www.axplatform.app',
  'https://myboyum.axplatform.app',
  'https://*.axplatform.app', // This won't work with the current logic, but keeping for reference
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🔒 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origins exactly
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    
    // Check if origin is a subdomain of axplatform.app
    if (origin && (origin.endsWith('.axplatform.app') || origin === 'https://axplatform.app')) {
      callback(null, true);
      return;
    }
    
    console.warn(`CORS: Blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
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

// Add trial checking middleware for all authenticated routes
app.use('/api/v1/*', checkTrialStatus, checkTrialReminders);

// API Routes with specific rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/auth', authLimiter, oauthRoutes); // OAuth routes
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
app.use('/api/v1/organizations/:orgId/teams/:teamId/cascading-messages', cascadingMessagesRoutes);
app.use('/api/v1/organizations/:orgId/todos', todoRoutes);
app.use('/api/v1/organizations/:orgId/issues', issueRoutes);
app.use('/api/v1/organizations/:orgId/headlines', headlinesRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/accountability', accountabilityRoutes);
app.use('/api/v1/subscription', subscriptionRoutesV2); // V2 routes for flat-rate pricing
app.use('/api/v1/subscription/legacy', subscriptionRoutes); // Keep V1 routes as legacy
app.use('/api/v1/consultant', consultantRoutes);
app.use('/api/v1/organizations/:orgId/organizational-charts', organizationalChartRoutes);
app.use('/api/v1/organizations/:orgId/skills', skillsRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/organizations/:orgId/documents', documentsRoutes);
app.use('/api/v1/organizations/:orgId/folders', foldersRoutes);
app.use('/api/v1/organizations/:orgId/storage', storageRoutes);
app.use('/api/v1/organizations/:orgId/ai/rock-assistant', aiRockAssistantRoutes);
app.use('/api/v1', completionTrackingRoutes);
app.use('/api/v1/user', userPreferencesRoutes);
app.use('/api/v1/demo', demoResetRoutes);
app.use('/api/v1/terminology', terminologyRoutes);
app.use('/api/v1', sharedMetricsRoutes);
app.use('/api/v1', exportRoutes);

// Webhook routes (must be before express.json() middleware for raw body)
app.use('/api/v1/webhooks', webhookRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize cron jobs
initializeSubscriptionJobs();

// Create HTTP server for Socket.io
const server = createServer(app);

// Initialize WebSocket service
meetingSocketService.initialize(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} - v1.1 with debug logging`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  if (process.env.ENABLE_MEETINGS === 'true') {
    console.log(`🤝 Meeting mode enabled with WebSocket support`);
  }
});

export default app;