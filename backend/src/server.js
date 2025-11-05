// Import Sentry for middleware (initialization happens in instrument.js)
import * as Sentry from '@sentry/node';
// Build trigger: 2025-10-29 - Annual Planning Goals fix

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

// Import scheduled jobs
import './jobs/overdueTodosCron.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import subscriptionRoutesV2 from './routes/subscriptionRoutesV2.js';
import webhookRoutes from './routes/webhookRoutes.js';
import emailInboundRoutes from './routes/emailInboundRoutes.js';
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
import dailyActiveUsersRoutes from './routes/dailyActiveUsers.js';
import annualCommitmentsRoutes from './routes/annualCommitments.js';
import swotItemsRoutes from './routes/swotItems.js';
import annualPlanningGoalsRoutes from './routes/annualPlanningGoals.js';
import processDocumentationRoutes from './routes/processDocumentation.js';
import healthRoutes from './routes/healthRoutes.js';
import todoReminderRoutes from './routes/todoReminders.js';
import meetingSessionsRoutes from './routes/meetingSessions.js';
import adminRoutes from './routes/admin.js';
import scorecardImportRoutes from './routes/scorecardImport.js';
import prioritiesImportRoutes from './routes/priorities-import.js';
import issuesImportRoutes from './routes/issues-import.js';
import todosImportRoutes from './routes/todos-import.js';
import meetingHistoryRoutes from './routes/meetingHistory.js';
import aiMeetingRoutes from './routes/aiMeeting.js';
import transcriptionRoutes from './routes/transcription.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { checkTrialStatus, checkTrialReminders } from './middleware/trialCheck.js';
import { requestMetrics } from './middleware/requestMetrics.js';
import { trackUserActivity } from './middleware/activityTracking.js';
import { authenticate } from './middleware/auth.js'; // Required for org validation
// import { setRequestContext } from './middleware/queryMetrics.js'; // Removed - export doesn't exist

// Import jobs
import { initializeSubscriptionJobs } from './jobs/subscriptionJobs.js';
import { initializeScheduledJobs } from './services/scheduledJobs.js';

// Import utilities
import { ensureUploadsDirectory } from './utils/ensureUploadsDirectory.js';

// Import database query function for organization access validation
import { query } from './config/database.js';

// Import WebSocket service
import meetingSocketService from './services/meetingSocketService.js';

// Load environment variables
dotenv.config();

// Ensure uploads directory exists
ensureUploadsDirectory();

const app = express();
const PORT = process.env.PORT || 3001;

// Add Sentry Express integration (after app creation, before other middleware)
if (process.env.SENTRY_DSN) {
  Sentry.addIntegration(Sentry.expressIntegration({ app }));
}

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
  'http://localhost:5174',  // Added for when 5173 is in use
  'http://localhost:5175',  // Added for when 5174 is in use
  'http://localhost:5176',  // Added for when 5175 is in use
  'https://eos-platform.netlify.app',
  'https://42vibes.com',
  'https://axplatform.app',
  'https://www.axplatform.app',
  'https://myboyum.axplatform.app',
  'https://*.axplatform.app', // This won't work with the current logic, but keeping for reference
  process.env.FRONTEND_URL
].filter(Boolean);

// Only log CORS origins in debug mode
if (process.env.LOG_LEVEL === 'debug') {
  console.log('🔒 CORS allowed origins:', allowedOrigins);
}

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
// Only log HTTP access in debug mode to reduce Railway log rate limiting
if (process.env.LOG_LEVEL === 'debug') {
  app.use(morgan('combined'));
} else {
  // In production, only log errors (status >= 400)
  app.use(morgan('combined', {
    skip: function (req, res) { return res.statusCode < 400; }
  }));
}

// Add observability middleware
app.use(requestMetrics);
app.use(trackUserActivity);
// app.use(setRequestContext); // Removed - function doesn't exist

// IMPORTANT: Webhook routes MUST come BEFORE body parsing middleware
// Stripe webhooks need the raw body to verify signatures
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/email', emailInboundRoutes);

// Health and utility routes (before body parsing, handles bots gracefully)
app.use('/', healthRoutes);

// Body parsing middleware (applies to all routes EXCEPT webhooks and health routes)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Apply general limiter to all API routes by default
app.use('/api/', generalLimiter);

// Health check endpoint (keeping for backward compatibility)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Add trial checking middleware for all authenticated routes (excluding webhooks)
app.use('/api/v1/*', (req, res, next) => {
  // Skip middleware for webhook routes
  if (req.path.startsWith('/webhooks')) {
    return next();
  }
  checkTrialStatus(req, res, () => {
    checkTrialReminders(req, res, next);
  });
});

// ============================================
// CRITICAL: Organization Access Validation Middleware
// ============================================
// This middleware validates that an authenticated user can only access
// their own organization's data. It must be placed BEFORE any other
// routes that use the /api/v1/organizations/:orgId/ path.
// Can be disabled with ENABLE_ORG_VALIDATION=false for emergency rollback.

const orgValidationEnabled = process.env.ENABLE_ORG_VALIDATION !== 'false';

if (orgValidationEnabled) {
  console.log('[Security] ✅ Organization access validation is ENABLED');
  
  // =====================================================================
  // CRITICAL FIX: Apply authentication BEFORE the validation middleware.
  // This ensures req.user is populated before the security check runs.
  // Exception: Skip authentication for public logo endpoint
  // =====================================================================
  app.use('/api/v1/organizations/:orgId', (req, res, next) => {
    // Skip authentication for logo GET requests (public endpoint)
    if (req.path.endsWith('/logo') && req.method === 'GET') {
      return next();
    }
    // Apply authentication for all other routes
    return authenticate(req, res, next);
  });
  
  app.use('/api/v1/organizations/:orgId', async (req, res, next) => {
    const { orgId } = req.params;

    // =====================================================================
    // CRITICAL FIX: Allow the 'current' keyword to pass through.
    // The route handler for '/organizations/current' is responsible for
    // securely resolving the user's actual organization.
    // =====================================================================
    if (orgId === 'current') {
      return next();
    }

    // Skip validation for public logo GET requests
    if (req.path.endsWith('/logo') && req.method === 'GET') {
      return next();
    }

    // If the user object isn't attached, something is wrong with authentication. Block the request.
    if (!req.user) {
      console.warn('[Security] Access denied: No user object on request. Ensure authenticate middleware runs first.');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required.' 
      });
    }

    // Get the user's organization ID (handle both field names)
    const userOrgId = req.user.organization_id || req.user.organizationId;

    // SPECIAL CASE 1: Super admins (users with no organization_id) can access any organization
    // This is typically for platform administrators or system users
    if (!userOrgId) {
      // Check if this is actually a super admin by checking their role
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        console.log(`[Security] Super admin ${req.user.email} granted access to org ${orgId}`);
        return next();
      }
      
      // If user has no org and is not an admin, something is wrong with their account
      console.warn(`[Security] DENIED: User ${req.user.id} (${req.user.email}) has no organization_id and is not an admin`);
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Your account is not properly configured.',
        code: 'NO_ORGANIZATION_ASSIGNED'
      });
    }

    // Check if the organization ID from the URL parameter matches the user's organization ID
    if (userOrgId !== orgId) {
      // SPECIAL CASE 2: Allow consultants to access organizations they are assigned to
      if (req.user.is_consultant) {
        try {
          const accessCheck = await query(
            'SELECT 1 FROM consultant_organizations WHERE consultant_user_id = $1 AND organization_id = $2',
            [req.user.id, orgId]
          );
          
          if (accessCheck.rows.length > 0) {
            // This consultant has explicit access to this organization. Allow them.
            console.log(`[Security] Consultant ${req.user.email} granted access to org ${orgId}`);
            return next();
          }
        } catch (error) {
          console.error('[Security] CRITICAL: Error during consultant access check:', error);
          return res.status(500).json({ 
            success: false,
            error: 'Server error during authorization check.' 
          });
        }
      }
      
      // If not a consultant with access, deny the request.
      console.warn(`[Security] DENIED: User ${req.user.id} (${req.user.email}) from org ${userOrgId} attempted to access org ${orgId}.`);
      
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. You do not have access to this organization.',
        code: 'ORGANIZATION_ACCESS_DENIED'
      });
    }

    // If we reach here, the user belongs to the organization. Allow the request to proceed.
    next();
  });
} else {
  console.warn('[Security] ⚠️  Organization access validation is DISABLED - THIS IS A SECURITY RISK!');
  console.warn('[Security] ⚠️  Users can access data from ANY organization!');
  console.warn('[Security] ⚠️  Enable with: ENABLE_ORG_VALIDATION=true');
}

// ============================================
// End of Organization Access Validation
// ============================================

// API Routes with specific rate limiters
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/auth', authLimiter, oauthRoutes); // OAuth routes
app.use('/api/v1/admin', adminRoutes); // Admin routes
app.use('/api/v1/scorecard/import', scorecardImportRoutes); // Scorecard import routes
app.use('/api/v1/priorities/import', prioritiesImportRoutes); // Priorities import routes
app.use('/api/v1/issues/import', issuesImportRoutes); // Issues import routes
app.use('/api/v1/todos/import', todosImportRoutes); // Todos import routes
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
app.use('/api/v1/organizations/:orgId/teams/:teamId/meeting-sessions', meetingSessionsRoutes);
app.use('/api/v1/organizations/:orgId/meeting-history', meetingHistoryRoutes);
app.use('/api/v1/ai', aiMeetingRoutes);
// Only log route mounting in debug mode
if (process.env.LOG_LEVEL === 'debug') {
  console.log('🔍 [Server] Mounting transcription routes at /api/v1/transcription');
}
app.use('/api/v1/transcription', transcriptionRoutes);
if (process.env.LOG_LEVEL === 'debug') {
  console.log('✅ [Server] Transcription routes mounted successfully');
}
app.use('/api/v1/organizations/:orgId/teams/:teamId/cascading-messages', cascadingMessagesRoutes);
app.use('/api/v1/organizations/:orgId/teams/:teamId/issues', issueRoutes);
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
app.use('/api/v1/processes', processDocumentationRoutes);
app.use('/api/v1/organizations/:orgId/ai/rock-assistant', aiRockAssistantRoutes);
app.use('/api/v1', completionTrackingRoutes);
app.use('/api/v1/user', userPreferencesRoutes);
app.use('/api/v1/demo', demoResetRoutes);
app.use('/api/v1/terminology', terminologyRoutes);
app.use('/api/v1', sharedMetricsRoutes);
app.use('/api/v1', exportRoutes);
app.use('/api/v1/daily-active-users', dailyActiveUsersRoutes);
app.use('/api/v1/todo-reminders', todoReminderRoutes);
app.use('/api/v1', annualCommitmentsRoutes);
app.use('/api/v1', swotItemsRoutes);
app.use('/api/v1', annualPlanningGoalsRoutes);

// TEMPORARY: Log transcription requests only in debug mode to reduce Railway rate limiting
app.use((req, res, next) => {
  if (req.url.includes('transcription') && process.env.LOG_LEVEL === 'debug') {
    console.log('🚨 TRANSCRIPTION REQUEST RECEIVED:', {
      method: req.method,
      url: req.url,
      path: req.path,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'NONE',
        'content-type': req.headers['content-type']
      }
    });
  }
  next();
});

// Sentry error handler must be added before other error middleware
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize cron jobs
initializeSubscriptionJobs();
initializeScheduledJobs();

// Clean up any stuck transcription sessions from previous crashes
const cleanupStuckTranscriptions = async () => {
  try {
    console.log('🧹 [Startup] Checking for stuck transcription sessions from previous crashes...');
    const cleanup = await import('./utils/transcriptionCleanup.js');
    const result = await cleanup.default.cleanupStuckSessions(5); // 5 minute threshold on startup
    
    if (result.cleaned > 0) {
      console.log(`✅ [Startup] Cleaned up ${result.cleaned} stuck transcription session(s)`);
    } else {
      console.log('✅ [Startup] No stuck transcription sessions found');
    }
  } catch (error) {
    console.error('❌ [Startup] Error during transcription cleanup:', error.message);
    // Don't fail server startup if cleanup fails
  }
};

// Run cleanup async (don't block server startup)
cleanupStuckTranscriptions();

// Create HTTP server for Socket.io
const server = createServer(app);

// Initialize WebSocket service
const io = meetingSocketService.initialize(server);
// Make io globally available for observability
global.io = io;

// Graceful shutdown handler for meeting resilience
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // 1. Stop accepting new connections
  server.close(() => {
    console.log('🚫 HTTP server closed');
  });
  
  // 2. Save all active transcription sessions
  try {
    const transcriptionService = await import('./services/transcriptionService.js');
    await transcriptionService.default.saveAllActiveSessions();
    console.log('💾 All active transcription sessions saved');
  } catch (error) {
    console.error('❌ Error saving transcription sessions:', error);
  }
  
  // 3. Close WebSocket connections gracefully
  try {
    if (global.io) {
      global.io.close();
      console.log('🔌 All WebSocket connections closed');
    }
  } catch (error) {
    console.error('❌ Error closing WebSocket connections:', error);
  }
  
  // 4. Close database connections
  try {
    const { pool } = await import('./config/database.js');
    await pool.end();
    console.log('🗃️ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
  
  console.log('✅ Graceful shutdown complete');
  process.exit(0);
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Set shutdown timeout (force exit after 10 seconds)
setTimeout(() => {
  if (isShuttingDown) {
    console.error('⏰ Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }
}, 10000);

// Only start server when not in test mode
// Tests use supertest which handles this internally
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} - v1.1 with debug logging`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    if (process.env.ENABLE_MEETINGS === 'true') {
      console.log(`🤝 Meeting mode enabled with WebSocket support`);
    }
  });
}

export default app;