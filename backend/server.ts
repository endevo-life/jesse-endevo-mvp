import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

import { score }          from './services/scoring';
import { generatePlan }   from './services/ai';
import { generatePDF }    from './services/pdf';
import { sendPlanEmail }  from './services/email';
import {
  asyncHandler,
  errorHandler,
  notFoundHandler,
  ValidationError,
} from './middleware/errorHandler';
import type { Answer, AssessmentPayload } from './types/index';

const app  = express();
const PORT = process.env.PORT ?? 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URLS ?? 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests (curl, Postman) in development
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── POST /api/assess ──────────────────────────────────────────────────────────
// Body: { name: string, email: string, answers: [{q: number, answer: 'A'|'B'|'C'|'D'}] }
app.post('/api/assess', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, answers } = req.body as { name?: unknown; email?: unknown; answers?: unknown };

  // ── Input validation ────────────────────────────────────────────────────
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ValidationError('name is required');
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('A valid email address is required');
  }
  if (!Array.isArray(answers) || answers.length !== 10) {
    throw new ValidationError('answers must be an array of exactly 10 items');
  }
  for (const item of answers as Record<string, unknown>[]) {
    if (!item.q || !['A', 'B', 'C', 'D'].includes(item.answer as string)) {
      throw new ValidationError('Each answer must have q (1–10) and answer (A/B/C/D)');
    }
  }

  const cleanName = (name as string).trim();

  // ── Step 1: Score ──────────────────────────────────────────────────────
  console.log(`[assess] Starting pipeline for "${cleanName}"`);
  const pipelineStart = Date.now();

  console.log(`[assess] Step 1/4 — Scoring`);
  const scored = score(answers as Answer[]);

  const payload: AssessmentPayload = {
    name:            cleanName,
    email:           email as string,
    readiness_score: scored.readiness_score,
    tier:            scored.tier,
    domain_scores:   scored.domain_scores,
    critical_gaps:   scored.critical_gaps,
    jesse_signals:   scored.jesse_signals,
    lowest_domain:   scored.lowest_domain,
  };

  console.log(`[assess] Score: ${payload.readiness_score}/100  Tier: ${payload.tier}`);

  // ── Step 2: Generate AI plan (silent fallback on failure) ──────────────
  console.log(`[assess] Step 2/4 — AI plan`);
  const { plan, source } = await generatePlan(payload);
  console.log(`[assess] Plan source: ${source}`);

  // ── Step 3: Generate branded PDF ──────────────────────────────────────
  console.log(`[assess] Step 3/4 — PDF generation`);
  const pdfBuffer = await generatePDF({
    name:            cleanName,
    readiness_score: payload.readiness_score,
    tier:            payload.tier,
    domain_scores:   payload.domain_scores,
    plan,
  });

  // ── Step 4: Send email via Resend with PDF attached ────────────────────
  console.log(`[assess] Step 4/4 — Email send`);
  await sendPlanEmail({
    name:      cleanName,
    email:     email as string,
    score:     payload.readiness_score,
    tier:      payload.tier,
    pdfBuffer,
  });

  // ── Step 5: 200 → frontend shows confirmation screen ──────────────────
  console.log(`[assess] Pipeline complete in ${Date.now() - pipelineStart}ms`);
  res.status(200).json({ success: true, message: 'Plan sent successfully' });
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status:    'ok',
    service:   'Jesse by ENDevo',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 — must come BEFORE the error handler ─────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler — must be LAST ──────────────────────────────────────
app.use(errorHandler);

// ── Start (local dev) / Export (Vercel serverless) ───────────────────────────
// On Vercel, the module is require()'d by the lambda runtime — don't call listen()
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`  Jesse Backend  |  port ${PORT}  |  ${process.env.NODE_ENV}`);
    console.log(`  Endpoint: POST http://localhost:${PORT}/api/assess`);
    console.log('─────────────────────────────────────────');
  });
}

module.exports = app;
