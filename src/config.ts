// Configuration file for global constants and environment variables
import logger from './utils/logger';

// API base URL with environment variable fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

// WebSocket URL for real-time communication
export const WS_URL = 'wss://artflow-backend-64f27556b9a4.herokuapp.com';

// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ziemoawiawjzscrxheea.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZW1vYXdpYXdqenNjcnhoZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MDI3MDgsImV4cCI6MjA1NTQ3ODcwOH0.LZFwUeJwpjis6nNWYM9eqk3WBejQ2QclJzDosfzZvts';

// Supabase realtime configuration
export const SUPABASE_REALTIME_CONFIG = {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
};

// Application config constants
export const APP_NAME = 'ArtFlow';
export const APP_VERSION = '1.0.0';

// Default timeout for API requests in milliseconds
export const API_TIMEOUT = 30000; 

// Log all configured URLs
logger.info('Config', 'Application initialized with the following endpoints:');
logger.info('Config', `API Base URL: ${API_BASE_URL}`);
logger.info('Config', `WebSocket URL: ${WS_URL}`);
logger.info('Config', `Supabase URL: ${SUPABASE_URL.replace(/^(https?:\/\/)([^:]+)(.*)$/, '$1***$3')}`); 