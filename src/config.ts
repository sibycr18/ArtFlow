// Configuration file for global constants and environment variables

// API base URL with environment variable fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

// Fix the WebSocket URL to ensure it has the correct format with double slashes
// export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://artflow-backend-64f27556b9a4.herokuapp.com';
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

// Other configuration constants can be added here 

// Application config constants

// Add other config variables here
export const APP_NAME = 'ArtFlow';
export const APP_VERSION = '1.0.0';

// Default timeout for API requests in milliseconds
export const API_TIMEOUT = 30000; 