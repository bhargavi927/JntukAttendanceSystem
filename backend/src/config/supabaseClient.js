import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('SUPABASE_URL:', supabaseUrl ? 'loaded' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'loaded' : 'MISSING');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return supabaseInstance;
}

export default function getSupabase() {
  if (!supabaseInstance) {
    return initializeSupabase();
  }
  return supabaseInstance;
}
