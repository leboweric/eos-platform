/**
 * Debug logger that only logs in development mode
 * Use this for verbose debugging logs that shouldn't appear in production
 */

const isProduction = process.env.NODE_ENV === 'production';

const debugLogger = {
  /**
   * Log debug information (only in development)
   */
  log: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },

  /**
   * Log info information (always logs, but prefixed)
   */
  info: (...args) => {
    console.log('[INFO]', ...args);
  },

  /**
   * Log warnings (always logs)
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always logs)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log success messages (always logs)
   */
  success: (...args) => {
    console.log('[SUCCESS]', ...args);
  }
};

export default debugLogger;
