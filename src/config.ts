// Configuration file for global constants and environment variables

// API base URL with environment variable fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://artflow-backend-64f27556b9a4.herokuapp.com';

// Fix the WebSocket URL to ensure it has the correct format with double slashes
// export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://artflow-backend-64f27556b9a4.herokuapp.com';
export const WS_URL = 'wss://artflow-backend-64f27556b9a4.herokuapp.com';

// Other configuration constants can be added here 

// Application config constants

// Add other config variables here
export const APP_NAME = 'ArtFlow';
export const APP_VERSION = '1.0.0';

// Default timeout for API requests in milliseconds
export const API_TIMEOUT = 30000; 