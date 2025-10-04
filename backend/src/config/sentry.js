import * as Sentry from '@sentry/node';

export const initializeSentry = (app) => {
  // Only initialize if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not found - error tracking disabled');
    return false;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Include Express integration
    integrations: [
      Sentry.expressIntegration({ app }),
    ],
    
    // Sample 10% of requests for performance monitoring
    tracesSampleRate: 0.1,
    
    // Set release version (use git commit hash in production)
    // Railway provides RAILWAY_GIT_COMMIT_SHA with the full git SHA
    release: process.env.RAILWAY_GIT_COMMIT_SHA 
      ? `axplatform-backend@${process.env.RAILWAY_GIT_COMMIT_SHA}`
      : undefined, // Let Sentry auto-detect in development
    
    // Attach useful context
    beforeSend(event) {
      // Don't send errors in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }
      return event;
    },
  });

  // Setup Express error handler
  Sentry.setupExpressErrorHandler(app);

  console.log('✓ Sentry initialized for backend');
  return true;
};

export default Sentry;