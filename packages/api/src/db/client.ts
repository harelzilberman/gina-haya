import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Check packages/api/.env\n' +
    'SUPABASE_URL: ' + (supabaseUrl ? '✓' : '✗ MISSING') + '\n' +
    'SUPABASE_SERVICE_ROLE_KEY: ' + (supabaseServiceRoleKey ? '✓' : '✗ MISSING')
  );
}

// Server-side client — uses service role key, bypasses RLS
// NEVER use this key in the frontend
export const db = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
