import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

function isAdmin(email: string): boolean {
  return !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

// GET /api/admin/waitlist — list all waitlist signups, newest first.
// Frontend groups by product_name.
router.get('/', async (req: any, res) => {
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const { data, error } = await db
    .from('waitlist_signups')
    .select('id, email, source, locale, product_id, product_name, notes, category, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/admin/waitlist]', error.message);
    return res.status(500).json({ error: 'db_error' });
  }

  return res.json(data ?? []);
});

export default router;
