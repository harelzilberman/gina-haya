import { Router } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

function isAdmin(email: string): boolean {
  return !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

function chunkText(text: string, size = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// POST /upload
router.post('/upload', async (req: any, res) => {
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const { title, language = 'he', pdfBase64 } = req.body;

  if (!title || !pdfBase64) {
    return res.status(400).json({ error: 'title and pdfBase64 are required' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse');
    const buffer = Buffer.from(pdfBase64, 'base64');
    const data = await pdfParse(buffer);
    const fullText = data.text;

    const chunks = chunkText(fullText);

    // Delete existing chunks for this source_file (allows re-upload to replace)
    await db.from('knowledge_base').delete().eq('source_file', title);

    const rows = chunks.map((chunk_text, chunk_index) => ({
      title,
      source_file: title,
      chunk_text,
      chunk_index,
      language,
    }));

    const { error } = await db.from('knowledge_base').insert(rows);
    if (error) throw error;

    return res.json({ success: true, chunks: chunks.length, title });
  } catch (err: any) {
    console.error('[knowledge/upload]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /list
router.get('/list', async (req: any, res) => {
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const { data, error } = await db
      .from('knowledge_base')
      .select('source_file, created_at');

    if (error) throw error;

    const grouped: Record<string, { chunks: number; uploaded_at: string }> = {};
    for (const row of data ?? []) {
      if (!grouped[row.source_file]) {
        grouped[row.source_file] = { chunks: 0, uploaded_at: row.created_at };
      }
      grouped[row.source_file].chunks++;
      if (row.created_at > grouped[row.source_file].uploaded_at) {
        grouped[row.source_file].uploaded_at = row.created_at;
      }
    }

    const result = Object.entries(grouped)
      .map(([source_file, info]) => ({
        source_file,
        chunks: info.chunks,
        uploaded_at: info.uploaded_at,
      }))
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));

    return res.json(result);
  } catch (err: any) {
    console.error('[knowledge/list]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /search?q=query  — test endpoint for the admin UI
router.get('/search', async (req: any, res) => {
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q param required' });

  try {
    const { data, error } = await db
      .from('knowledge_base')
      .select('chunk_text, source_file, title')
      .textSearch('chunk_text', q.split(' ').join(' | '), {
        type: 'websearch',
        config: 'simple',
      })
      .limit(4);

    if (error) throw error;
    return res.json(data ?? []);
  } catch (err: any) {
    console.error('[knowledge/search]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /:sourceFile
router.delete('/:sourceFile', async (req: any, res) => {
  if (!isAdmin(req.user.email)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const sourceFile = decodeURIComponent(req.params.sourceFile);

  try {
    const { data, error } = await db
      .from('knowledge_base')
      .delete()
      .eq('source_file', sourceFile)
      .select();

    if (error) throw error;

    return res.json({ success: true, deleted: data?.length ?? 0 });
  } catch (err: any) {
    console.error('[knowledge/delete]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
