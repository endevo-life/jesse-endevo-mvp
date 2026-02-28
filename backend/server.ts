import path from 'path';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
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

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔧 Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'production');
console.log('- VERCEL:', process.env.VERCEL || 'false');
console.log('- RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('- ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

const app  = express();
const PORT = process.env.PORT ?? 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://jesse-endevo-mvp.vercel.app',
  'https://*.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',').map(s => s.trim()) : []),
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / Postman
    if (allowedOrigins.some(o => o.includes('*')
      ? new RegExp('^' + o.replace('*', '.*') + '$').test(origin)
      : o === origin
    )) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const safe = { ...req.body };
    if (safe.email) safe.email = '***';
    console.log('Request body:', safe);
  }
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
    status:      'ok',
    service:     'Jesse by ENDevo',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    vercel:      !!process.env.VERCEL,
    resend:      !!process.env.RESEND_API_KEY,
    anthropic:   !!process.env.ANTHROPIC_API_KEY,
  });
});

// ── 404 — must come BEFORE the error handler ─────────────────────────────────
app.use(notFoundHandler);

// ── Global error handler — must be LAST ──────────────────────────────────────
app.use(errorHandler);

// ── Start (local dev) / Export (Vercel serverless) ───────────────────────────
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log('─────────────────────────────────────────');
    console.log(`🚀 Jesse Backend running on http://localhost:${PORT}`);
    console.log(`📋 Assess:  POST http://localhost:${PORT}/api/assess`);
    console.log(`🔍 Health:  GET  http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Env:     ${process.env.NODE_ENV || 'development'}`);
    console.log('─────────────────────────────────────────');
  });
}

module.exports = app;
