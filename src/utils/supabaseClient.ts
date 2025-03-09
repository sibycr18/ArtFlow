import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Production environment configuration with improved resilience
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    timeout: 30000, // Increase timeout for slower networks
    headers: {
      apikey: SUPABASE_ANON_KEY
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'artflow-frontend'
    }
  }
};

// For debugging connection issues
console.log("[Supabase] Initializing with URL:", SUPABASE_URL.replace(/^(https?:\/\/)([^:]+)(.*)$/, '$1***$3'));

// Create and export the Supabase client instance with the proper configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);

export default supabase; 