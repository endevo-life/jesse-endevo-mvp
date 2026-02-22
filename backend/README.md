# Jesse Backend — ENDevo Digital Readiness Assessment

**Single endpoint. No database. No auth. Stateless.**

---

## How It Works (Full Flow)

```
Frontend (React)
  │
  │  POST /api/assess
  │  { name, email, answers[10] }
  ▼
Backend (this server)
  │
  ├─ 1. Validate input
  ├─ 2. Score answers  →  readiness_score (0–100), tier, domain_scores, gaps
  ├─ 3. Call Claude AI  →  personalised 7-day plan  (fallback: static plan)
  ├─ 4. Generate PDF   →  2-page branded PDF in memory
  ├─ 5. Send email via Resend  →  PDF attached, warm Jesse tone
  │
  └─ 200 { success: true, message: "Plan sent successfully" }
       OR
     500 { success: false, message: "Something went wrong. Please try again." }
```

The user never sees a score on screen. The score and plan live **only in the PDF** delivered to their inbox.

---

## File Structure

```
backend/
├── services/
│   ├── scoring.js   # Deterministic scoring algorithm (no AI, runs instantly)
│   ├── ai.js        # Claude API call + 4 static fallback plans
│   ├── pdf.js       # pdf-lib 2-page PDF + donut chart via QuickChart
│   └── email.js     # Resend.com email with PDF attachment
├── server.js        # Express app — single route POST /api/assess
├── .env             # Your local keys (never commit)
├── .env.example     # Template — copy this to .env
└── README.md        # This file
```

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Where to get it | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Optional (uses fallback plans if missing) |
| `AI_MODEL` | `claude-sonnet-4-6` recommended | Optional |
| `AI_TIMEOUT_MS` | Default `10000` (10 s) | Optional |
| `RESEND_API_KEY` | resend.com → API Keys | **Required for email** |
| `EMAIL_FROM` | Must be a verified Resend domain | **Required for email** |
| `EMAIL_REPLY_TO` | `hello@endevo.life` | Optional |
| `FRONTEND_URLS` | Comma-separated CORS origins | Optional |
| `PORT` | Default `5000` | Optional |

> **Without `RESEND_API_KEY`**: the server will score and generate the PDF but skip sending the email. Good for local PDF testing.
>
> **Without `ANTHROPIC_API_KEY`**: the server uses a pre-written static 7-day plan for the user's tier. Demo never breaks.

### 3. Start the server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

You should see:
```
─────────────────────────────────────────
  Jesse Backend  |  port 5000  |  development
  Endpoint: POST http://localhost:5000/api/assess
─────────────────────────────────────────
MongoDB Connected: ...   ← NOT shown (no DB)
```

---

## API Reference

### `POST /api/assess`

The only endpoint. Frontend calls this once when the user submits name + email.

**Request**

```http
POST /api/assess
Content-Type: application/json

{
  "name":  "Sarah",
  "email": "sarah@example.com",
  "answers": [
    { "q": 1,  "answer": "D" },
    { "q": 2,  "answer": "B" },
    { "q": 3,  "answer": "D" },
    { "q": 4,  "answer": "C" },
    { "q": 5,  "answer": "D" },
    { "q": 6,  "answer": "D" },
    { "q": 7,  "answer": "B" },
    { "q": 8,  "answer": "C" },
    { "q": 9,  "answer": "C" },
    { "q": 10, "answer": "A" }
  ]
}
```

**Success response** — triggers frontend confirmation screen

```json
HTTP 200 OK
{
  "success": true,
  "message": "Plan sent successfully"
}
```

**Error response** — frontend shows retry message

```json
HTTP 500
{
  "success": false,
  "message": "Something went wrong. Please try again."
}
```

**Validation errors** (bad input from frontend)

```json
HTTP 400
{
  "success": false,
  "message": "answers must be an array of exactly 10 items"
}
```

### `GET /api/health`

```json
{ "status": "ok", "service": "Jesse by ENDevo", "timestamp": "..." }
```

---

## Scoring Algorithm

**Answer point values:** A = 10, B = 6, C = 3, D = 0

**Domain mapping:**

| Domain | Questions | Max raw pts |
|---|---|---|
| Access & Ownership (30%) | Q1, Q2, Q6, Q10 | 40 |
| Data Loss (20%) | Q3, Q8 | 20 |
| Platform Limitation (15%) | Q4, Q9 | 20 |
| Stewardship (15%) | Q5, Q7 | 20 |
| Financial Exposure (20%) | Phase 2 — deferred | — |

> Financial Exposure is redistributed across the active domains for MVP.

**Readiness Score** = sum of all 10 answer points (0–100).

**Tier assignment:**

| Score | Tier |
|---|---|
| 85–100 | Peace Champion |
| 60–84 | On Your Way |
| 35–59 | Getting Clarity |
| 0–34 | Starting Fresh |

---

## Internal Calculated Payload

After scoring, the server assembles this object. It feeds the AI prompt and PDF generator. It is never returned to the frontend.

```json
{
  "name":            "Sarah",
  "email":           "sarah@example.com",
  "readiness_score": 42,
  "tier":            "Getting Clarity",
  "domain_scores": {
    "access_ownership":    18,
    "data_loss":            8,
    "platform_limitation":  7,
    "stewardship":          9
  },
  "critical_gaps":   ["Q1-D", "Q4-C", "Q9-C"],
  "jesse_signals":   [
    "No legacy contact set up — loved ones cannot access your phone",
    "Digital legacy not yet assigned — still on the to-do list",
    "2FA only partially configured — key accounts still exposed"
  ],
  "lowest_domain":   "platform_limitation"
}
```

---

## AI Prompt Template

Injected with the calculated payload. Never exposed to the frontend.

**System prompt:**
> You are Jesse, ENDevo's warm and trusted digital readiness guide. You help people feel prepared and clear — not scared or overwhelmed. Your tone is: warm, direct, practical, encouraging. Never legal or clinical. No estate planning language. No medical or financial advice. Educational only.

**User prompt:**
> Generate a 7-day action plan for [name]. Their Readiness Score is [score]/100. Their tier is [tier]. Their critical gaps are: [jesse_signals]. Their weakest domain is: [lowest_domain]. Format: Day 1: [Title] / [2 sentences]. Repeat for Days 2–7. Achievable in under 30 minutes each. Match urgency to tier.

---

## Fallback Plans

If Claude fails or times out (> 10 seconds), the server silently uses a pre-written 7-day plan for the user's tier. The user **never sees an error**. Four plans exist — one per tier — stored as constants in `services/ai.js`.

---

## PDF Structure

Generated with `pdf-lib` (no headless Chrome). Target: < 3 seconds, < 500 KB.

| Page | Content |
|---|---|
| **Page 1 — Score Profile** | ENDevo logo + Jesse header · User name + date · Large readiness score · Tier badge with opening line · Domain breakdown bars + donut chart (QuickChart) · Disclaimer footer |
| **Page 2 — 7-Day Plan** | Bold header · Day 1–7 each with title + 2-sentence description · ENDevo branded footer |

**Brand colours:** Navy `#1B2A4A` · Orange `#E8651A`
**Chart colours:** Access=blue `#4A90D9` · Data Loss=teal `#2DD4BF` · Platform=orange `#E8651A` · Stewardship=green `#22C55E`

---

## Email (Resend)

| Field | Value |
|---|---|
| Provider | Resend.com |
| From | `jesse@endevo.life` |
| Subject | Your 7-Day Digital Readiness Plan from Jesse |
| Body | Branded HTML — warm Jesse tone, score card, tier |
| Attachment | `jesse-readiness-plan.pdf` |
| Reply-To | `hello@endevo.life` |

---

## Testing

### Option A — curl (quickest)

```bash
curl -X POST http://localhost:5000/api/assess \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah",
    "email": "your-real-email@gmail.com",
    "answers": [
      {"q":1,"answer":"D"},
      {"q":2,"answer":"B"},
      {"q":3,"answer":"D"},
      {"q":4,"answer":"C"},
      {"q":5,"answer":"D"},
      {"q":6,"answer":"D"},
      {"q":7,"answer":"B"},
      {"q":8,"answer":"C"},
      {"q":9,"answer":"C"},
      {"q":10,"answer":"A"}
    ]
  }'
```

Expected: `{"success":true,"message":"Plan sent successfully"}`
Then check **your-real-email@gmail.com** inbox for the PDF.

### Option B — Postman / Insomnia

- Method: `POST`
- URL: `http://localhost:5000/api/assess`
- Header: `Content-Type: application/json`
- Body (raw JSON): paste the payload above, change `email` to yours

### Test each tier

| Tier | All answers |
|---|---|
| Peace Champion | All `A` |
| On Your Way | All `B` |
| Getting Clarity | All `C` |
| Starting Fresh | All `D` |

### Test without email (no Resend key)

Remove `RESEND_API_KEY` from `.env` — server will score + build PDF but skip email and still return `200`. Useful for checking scoring logic.

### Test without AI (no Anthropic key)

Remove `ANTHROPIC_API_KEY` from `.env` — server uses a static fallback plan automatically. Still returns `200` and sends the email.

### Health check

```bash
curl http://localhost:5000/api/health
```

---

## Deployment (Railway / Render)

1. Push repo to GitHub.
2. Create new project on Railway or Render, connect the repo, set root to `backend/`.
3. Add all environment variables from `.env.example` in the platform dashboard.
4. The platform runs `npm start` automatically.
5. Update `FRONTEND_URLS` to your Vercel frontend URL.
6. Update CORS in frontend to point to the new backend URL.

---

## Out of Scope (Do Not Add)

Per the technical spec — scope creep will break the March 8 demo deadline:

- ❌ Database or persistent storage of any kind
- ❌ User accounts or authentication
- ❌ Score display on screen (score lives in PDF only)
- ❌ More than one endpoint
- ❌ More than 10 questions
- ❌ Payments, subscriptions, admin portals
- ❌ Real-time chat
