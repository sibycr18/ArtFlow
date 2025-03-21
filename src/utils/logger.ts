// Utility for consistent logging throughout the application

// Log levels
type LogLevel = 'info' | 'debug' | 'warn' | 'error';

// Colors for different log levels in browser console
const LOG_COLORS = {
  info: '#0088ff',
  debug: '#f0ad4e',
  warn: '#ff9800',
  error: '#ff0000'
};

// Enable/disable logging based on environment
const IS_DEV = import.meta.env.DEV;
const ENABLE_DEBUG_LOGS = IS_DEV || import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true';

/**
 * Logger utility for consistent logging with visual formatting
 */
const logger = {
  /**
   * Information logs for normal operations
   */
  info: (module: string, message: string, ...args: any[]) => {
    console.log(
      `%c[${module}]%c ${message}`,
      `font-weight: bold; color: ${LOG_COLORS.info}`,
      'color: inherit',
      ...args
    );
  },

  /**
   * Debug logs for development purposes
   */
  debug: (module: string, message: string, ...args: any[]) => {
    if (ENABLE_DEBUG_LOGS) {
      console.log(
        `%c[${module}]%c ${message}`,
        `font-weight: bold; color: ${LOG_COLORS.debug}`,
        'color: inherit',
        ...args
      );
    }
  },

  /**
   * Warning logs for potential issues
   */
  warn: (module: string, message: string, ...args: any[]) => {
    console.warn(
      `%c[${module}]%c ${message}`,
      `font-weight: bold; color: ${LOG_COLORS.warn}`,
      'color: inherit',
      ...args
    );
  },

  /**
   * Error logs for definite problems
   */
  error: (module: string, message: string, ...args: any[]) => {
    console.error(
      `%c[${module}]%c ${message}`,
      `font-weight: bold; color: ${LOG_COLORS.error}`,
      'color: inherit',
      ...args
    );
  }
};

export default logger; 