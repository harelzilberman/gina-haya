/**
 * Migration runner for Gina Haya
 * 
 * For the initial schema and future migrations:
 * The SQL files are in packages/api/src/db/migrations/
 * 
 * HOW TO RUN MIGRATIONS:
 * 1. Go to Supabase dashboard → SQL Editor → New Query
 * 2. Paste the contents of the migration file
 * 3. Click Run
 * 
 * This script validates that your .env is set up correctly
 * and lists which migration files exist.
 */
import 'dotenv/config';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

async function migrate(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in packages/api/.env'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Test connection
  const { error } = await supabase.from('users').select('count').limit(0);
  if (error && error.code !== 'PGRST116') {
    console.log('⚠  Could not connect to Supabase:', error.message);
    console.log('   Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  console.log('✓ Supabase connection OK');

  // List migration files
  const migrationsDir = join(__dirname, 'migrations');
  let files: string[] = [];
  try {
    files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch {
    console.log('⚠  No migrations directory found at', migrationsDir);
    process.exit(1);
  }

  console.log(`\nFound ${files.length} migration file(s):`);
  files.forEach(f => {
    console.log(`  → ${f}`);
  });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To apply migrations, paste each SQL file into:
Supabase Dashboard → SQL Editor → New Query → Run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // Print the SQL for convenience
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`\n── ${file} ──────────────────────────────────`);
    console.log(sql.substring(0, 200) + (sql.length > 200 ? '\n... (see file for full SQL)' : ''));
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
