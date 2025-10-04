// Sentry must be initialized before any other imports
import * as Sentry from '@sentry/react';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of requests
    
    // Session replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Set release version using Netlify's git commit SHA or let Sentry auto-detect
    // Netlify provides COMMIT_REF environment variable with the git SHA
    // In development, this will be undefined and Sentry will auto-detect from git
    ...(import.meta.env.VITE_COMMIT_REF && { 
      release: `axplatform-frontend@${import.meta.env.VITE_COMMIT_REF}` 
    }),
    
    // Don't send events in development
    beforeSend(event) {
      if (import.meta.env.MODE === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }
      return event;
    },
  });
  
  console.log('✓ Sentry initialized for frontend with DSN:', import.meta.env.VITE_SENTRY_DSN?.substring(0, 20) + '...');
} else {
  console.warn('Sentry DSN not found - error tracking disabled');
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
