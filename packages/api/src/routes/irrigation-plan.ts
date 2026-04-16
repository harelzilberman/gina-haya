import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';

export const irrigationPlanRouter = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

irrigationPlanRouter.use(verifyToken);

// ── POST /api/irrigation-plan ────────────────────────────────────────────────
irrigationPlanRouter.post('/', async (req: any, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'missing prompt' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json(message);
  } catch (err: any) {
    console.error('[POST /api/irrigation-plan]', err.message);
    res.status(500).json({ error: err.message });
  }
});
