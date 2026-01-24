/**
 * Production logger override
 * Reduces console.log verbosity in production while keeping errors/warnings
 */

const isProduction = process.env.NODE_ENV === 'production';

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

/**
 * Initialize production logging
 * - Suppresses console.log and console.debug in production
 * - Keeps console.error, console.warn, and console.info
 * - Allows whitelisted log patterns (startup, errors, important events)
 */
export function initProductionLogging() {
  if (!isProduction) {
    // In development, keep all logging
    return;
  }

  // Whitelist patterns that should always log in production
  const whitelistPatterns = [
    /^\ud83d\ude80/,  // Startup messages (🚀)
    /^\u2705/,   // Success messages (✅)
    /^\u274c/,   // Error messages (❌)
    /^\u26a0\ufe0f/,   // Warning messages (⚠️)
    /^\[INFO\]/,  // Info prefix
    /^\[ERROR\]/, // Error prefix
    /^\[WARN\]/,  // Warn prefix
    /Server running/i,
    /Database/i,
    /Migration/i,
    /Health check/i,
    /Graceful shutdown/i,
    /CRON/i,
    /Sentry/i
  ];

  // Override console.log in production
  console.log = (...args) => {
    // Safely convert args to string, handling objects
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }).join(' ');
    
    // Check if message matches whitelist
    const shouldLog = whitelistPatterns.some(pattern => pattern.test(message));
    
    if (shouldLog) {
      originalConsole.log(...args);
    }
    // Otherwise, suppress the log
  };

  // Override console.debug to be completely silent in production
  console.debug = () => {};

  // Keep console.info but prefix it
  console.info = (...args) => {
    originalConsole.info('[INFO]', ...args);
  };

  // Keep console.warn and console.error unchanged
  // (they're already important enough to always log)
}

// Export original console for cases where you need to force logging
export { originalConsole };
