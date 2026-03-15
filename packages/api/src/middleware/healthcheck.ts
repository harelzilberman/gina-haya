import type { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'STRIPE_SECRET_KEY',
];

export async function healthcheck(_req: Request, res: Response): Promise<void> {
  const timestamp = new Date().toISOString();
  const version = '1.0.0';

  // Check required env vars
  const missingEnv = REQUIRED_ENV_VARS.filter(k => !process.env[k]);

  // Check DB connectivity
  let dbStatus: 'ok' | 'error' = 'error';
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL!,
    );
    const { error } = await supabase.from('users').select('id').limit(1);
    if (!error) dbStatus = 'ok';
  } catch {
    dbStatus = 'error';
  }

  if (dbStatus === 'error' || missingEnv.length > 0) {
    res.status(500).json({
      status: 'error',
      db: dbStatus,
      ...(missingEnv.length > 0 && { missingEnv }),
      timestamp,
      version,
    });
    return;
  }

  res.json({ status: 'ok', db: 'ok', timestamp, version });
}
