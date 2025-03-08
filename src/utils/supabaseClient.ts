import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_REALTIME_CONFIG } from '../config';

// Log URL and key presence to help debug if there are issues
if (import.meta.env.DEV) {
  console.log('Supabase URL:', SUPABASE_URL ? 'Available' : 'Missing');
  console.log('Supabase Key:', SUPABASE_ANON_KEY ? 'Available' : 'Missing');
}

// Create and export the Supabase client instance with the proper configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_REALTIME_CONFIG);

export default supabase; 