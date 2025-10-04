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
    
    // Set release version if available
    release: import.meta.env.VITE_APP_VERSION || 'development',
    
    // Don't send events in development
    beforeSend(event) {
      if (import.meta.env.MODE === 'development') {
        console.log('Sentry event (not sent in dev):', event);
        return null;
      }
      return event;
    },
  });
  
  console.log('✓ Sentry initialized for frontend');
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
