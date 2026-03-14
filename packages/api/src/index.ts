import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://gina-haya.com', 'https://www.gina-haya.com']
    : ['http://localhost:5173'],
  credentials: true,
}));

// Global rate limit — tighter limits applied per-route
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// Remaining routers wired up in Phase 2:
// import { calendarRouter } from './routes/calendar';
// import { mooshRouter }    from './routes/moosh';
// import { gardenRouter }   from './routes/garden';
// app.use('/api/calendar',  calendarRouter);
// app.use('/api/moosh',     mooshRouter);
// app.use('/api/garden',    gardenRouter);

app.listen(PORT, () => {
  console.log(`Gina Haya API running on http://localhost:${PORT}`);
});

export default app;
