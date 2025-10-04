// Sentry initialization for ES modules
// This file must be imported BEFORE any other modules to properly instrument the app
// See: https://docs.sentry.io/platforms/javascript/guides/express/install/esm/

import * as Sentry from '@sentry/node';

// Only initialize if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Include Node.js integration (Express integration will be added in server.js)
    integrations: [
      Sentry.nodeContextIntegration(),
      Sentry.localVariablesIntegration(),
      Sentry.requestDataIntegration(),
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

  console.log('✓ Sentry initialized early for backend');
} else {
  console.warn('Sentry DSN not found - error tracking disabled');
}