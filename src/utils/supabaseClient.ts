import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import logger from './logger';

// Production environment configuration with improved realtime performance
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  realtime: {
    params: {
      eventsPerSecond: 40  // Increased from 10 to allow more events per second
    },
    timeout: 5000, // Reduced timeout from 30000ms to 5000ms for faster connections
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'X-Client-Info': 'artflow-realtime'
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'artflow-frontend'
    }
  }
};

// For debugging connection issues
logger.info('Supabase', `Initializing with URL: ${SUPABASE_URL.replace(/^(https?:\/\/)([^:]+)(.*)$/, '$1***$3')}`);
logger.debug('Supabase', 'Realtime config:', {
  eventsPerSecond: supabaseConfig.realtime.params.eventsPerSecond,
  timeout: supabaseConfig.realtime.timeout
});

// Create and export the Supabase client instance with the proper configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);

export default supabase; 