import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
// Raw body required for Stripe webhook signature verification — must come
// before express.json() so the Buffer is preserved for that one route.
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://gina-haya.com', 'https://www.gina-haya.com']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Health check ────────────────────────────────────────────────────────────
import { healthcheck } from './middleware/healthcheck';
app.get('/health', healthcheck);

// ── Routes ──────────────────────────────────────────────────────────────────
import { authRouter }    from './routes/auth';
import { gardenRouter }  from './routes/garden';
import { plantsRouter }  from './routes/plants';
import { calendarRouter } from './routes/calendar';
import { mooshRouter }   from './routes/moosh';
import { billingRouter } from './routes/billing';
import { emailRouter }   from './routes/email';
import cron from 'node-cron';
import { sendDailyTipToAllUsers } from './cron/daily-tip';

app.use('/api/auth',     authRouter);
app.use('/api/garden',   gardenRouter);
app.use('/api/plants',   plantsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/moosh',    mooshRouter);
app.use('/api/billing',  billingRouter);
app.use('/api/email',    emailRouter);

// ── Cron: daily tip email at 06:00 Israel time (04:00 UTC) ──────────────────
cron.schedule('0 4 * * *', sendDailyTipToAllUsers);

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Gina Haya API running on http://localhost:${PORT}`);
});

export default app;
