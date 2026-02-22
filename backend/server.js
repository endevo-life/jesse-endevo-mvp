'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { score }         = require('./services/scoring');
const { generatePlan }  = require('./services/ai');
const { generatePDF }   = require('./services/pdf');
const { sendPlanEmail } = require('./services/email');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:3000')
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
// The only endpoint in the product.
// Body: { name: string, email: string, answers: [{q: number, answer: string}] }
app.post('/api/assess', async (req, res) => {
  const { name, email, answers } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'name is required' });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }
  if (!Array.isArray(answers) || answers.length !== 10) {
    return res.status(400).json({ success: false, message: 'answers must be an array of exactly 10 items' });
  }
  for (const item of answers) {
    if (!item.q || !['A', 'B', 'C', 'D'].includes(item.answer)) {
      return res.status(400).json({ success: false, message: 'Each answer must have q (1-10) and answer (A/B/C/D)' });
    }
  }

  try {
    const cleanName = name.trim();

    // ── Step 1: Score ───────────────────────────────────────────────────────
    console.log(`[assess] Scoring for ${cleanName} <${email}>`);
    const scored = score(answers);

    // Internal calculated payload (per spec §3.3)
    const payload = {
      name:            cleanName,
      email,
      readiness_score: scored.readiness_score,
      tier:            scored.tier,
      domain_scores:   scored.domain_scores,
      critical_gaps:   scored.critical_gaps,
      jesse_signals:   scored.jesse_signals,
      lowest_domain:   scored.lowest_domain,
    };

    console.log(`[assess] Score: ${payload.readiness_score}/100  Tier: ${payload.tier}`);

    // ── Step 2: Generate AI plan (silent fallback on any failure) ───────────
    const { plan } = await generatePlan(payload);

    // ── Step 3: Generate branded PDF ───────────────────────────────────────
    const pdfBuffer = await generatePDF({
      name:            cleanName,
      readiness_score: payload.readiness_score,
      tier:            payload.tier,
      domain_scores:   payload.domain_scores,
      plan,
    });

    // JUST FOR TESTING, REMOVE LATER
    require('fs').writeFileSync('test-output.pdf', pdfBuffer);

    // ── Step 4: Send email via Resend with PDF attached ─────────────────────
    await sendPlanEmail({
      name:      cleanName,
      email,
      score:     payload.readiness_score,
      tier:      payload.tier,
      pdfBuffer,
    });

    // ── Step 5: 200 → frontend shows confirmation screen ───────────────────
    return res.status(200).json({ success: true, message: 'Plan sent successfully' });

  } catch (err) {
    console.error('[assess] Unhandled error:', err.message);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// ── Health check (useful for Railway / Render deploy verification) ────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Jesse by ENDevo', timestamp: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  Jesse Backend  |  port ${PORT}  |  ${process.env.NODE_ENV}`);
  console.log(`  Endpoint: POST http://localhost:${PORT}/api/assess`);
  console.log('─────────────────────────────────────────');
});
