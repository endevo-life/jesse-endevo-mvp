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
  ├─ 4. Generate PDF   →  multi-page branded PDF in memory
  ├─ 5. Send email via Resend  →  PDF attached, warm Jesse tone
  │
  └─ 200 { success: true, message: "Plan sent successfully" }
       OR
     400 { success: false, message: "Validation error message" }
       OR
     500 { success: false, message: "Something went wrong. Please try again." }
```

The user never sees a score on screen. The score and plan live **only in the PDF** delivered to their inbox.

---

## File Structure

```
backend/
├── middleware/
│   └── errorHandler.ts  # asyncHandler, ValidationError, ServiceError, 404/500 handlers
├── services/
│   ├── scoring.ts       # Deterministic scoring algorithm (no AI, runs instantly)
│   ├── ai.ts            # Claude API call + 4 static fallback plans (one per tier)
│   ├── pdf.ts           # pdf-lib multi-page PDF + donut chart via QuickChart
│   └── email.ts         # Resend.com email with PDF attachment + embedded logo
├── types/
│   └── index.ts         # Shared TypeScript types
├── server.ts            # Express app — single route POST /api/assess
├── vercel.json          # Vercel serverless config
├── tsconfig.json        # TypeScript config
├── package.json
├── .env                 # Your local keys (never commit)
├── .env.example         # Template — copy this to .env
└── README.md            # This file
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
| `EMAIL_FROM` | Must be a verified Resend sender domain | **Required for email** |
| `EMAIL_REPLY_TO` | e.g. `hello@endevo.life` | Optional |
| `FRONTEND_URLS` | Comma-separated CORS origins | Optional |
| `PORT` | Default `5000` | Optional |

> **Without `RESEND_API_KEY`**: the server will score and generate the PDF but skip sending the email. Logs `[Email] No Resend API key — skipping email send`. Good for local testing.
>
> **Without `ANTHROPIC_API_KEY`**: the server uses a pre-written static 7-day plan for the user's tier. Demo never breaks.

### 3. Start the server

```bash
# Development (auto-restart on save)
npm run dev

# Production build + start
npm run build && npm start
```

You should see:
```
─────────────────────────────────────────
  Jesse Backend  |  port 5000  |  development
  Endpoint: POST http://localhost:5000/api/assess
─────────────────────────────────────────
```

---

## API Reference

### `POST /api/assess`

The only endpoint. Frontend calls this once when the user submits name + email after completing all 10 questions.

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
  "message": "Something went wrong. Please try again.",
  "code": "INTERNAL_ERROR"
}
```

**Validation errors** (bad input)

```json
HTTP 400
{
  "success": false,
  "message": "answers must be an array of exactly 10 items",
  "code": "VALIDATION_ERROR"
}
```

### `GET /api/health`

```json
{ "status": "ok", "service": "Jesse by ENDevo", "timestamp": "2026-02-28T06:49:47.727Z" }
```

---

## Scoring Algorithm

**Answer point values:** A = 10, B = 6, C = 3, D = 0

**Domain mapping:**

| Domain (display label) | Questions | Max raw pts | % of total |
|---|---|---|---|
| Passwords & Logins | Q1, Q2, Q6, Q10 | 40 | 40% |
| Files & Precious Memories | Q3, Q8 | 20 | 20% |
| Apps & Online Accounts | Q4, Q9 | 20 | 20% |
| Legacy & Family Planning | Q5, Q7 | 20 | 20% |

> Financial Exposure domain is deferred to Phase 2. Weighting redistributed across active domains.

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

After scoring, the server assembles this object. It feeds the AI prompt and PDF generator. It is **never** returned to the frontend.

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
> Generate a 7-day action plan for [name]. Their Readiness Score is [score]/100. Their tier is [tier]. Their critical gaps are listed. Their weakest domain is [lowest_domain]. Format strictly as plain text — Day N: Title / bullet items with `- Bold Title | Description` / NOTE line. No markdown symbols.

---

## Fallback Plans

If Claude fails or times out (> 10 seconds), the server silently uses a pre-written 7-day plan for the user's tier. The user **never sees an error**. Four plans exist — one per tier — stored as constants in `services/ai.ts`.

---

## PDF Structure

Generated with `pdf-lib` (no headless Chrome, no puppeteer). Target: < 3 seconds, < 500 KB.

| Page | Content |
|---|---|
| **Page 1 — Score Profile** | ENDevo logo · User name + date · Large readiness score (0–100) · Tier badge · Opening line · "Your Score Breakdown" bars (4 domains) · Donut chart via QuickChart · 7-day journey tracker · Disclaimer footer |
| **Pages 2+ — 7-Day Action Plan** | Navy header · Day 1–7 each in left/right column layout · Interactive checkboxes (AcroForm — saveable in PDF viewers) · Bold action title + warm description per item · NOTE encouragement line per day · ENDevo branded footer |
| **Last Page (end of plan)** | **MY NOTES** — interactive multi-line text field (saveable in any PDF viewer) · Orange accent bar |

**Brand colours:** Navy `#1B2A4A` · Orange `#E8651A`
**Domain chart colours:** Passwords & Logins = blue `#4A90D9` · Files & Memories = teal `#2DD4BE` · Apps & Accounts = orange `#E8651A` · Legacy = green `#22C55E`

---

## Email (Resend)

| Field | Value |
|---|---|
| Provider | Resend.com |
| From | `hello@endevo.life` (must be verified sender) |
| Subject | Your 7-Day Digital Readiness Plan from Jesse |
| Header | ENDevo logo embedded as base64 (no external image URL needed) |
| Body | Branded HTML — warm Jesse tone, readiness score card, tier badge |
| Attachment | `{Name}-7DayReadinessPlan-{mm}-{dd}-{yyyy}.pdf` · `application/pdf` |
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
Then check your inbox for `Sarah-7DayReadinessPlan-mm-dd-yyyy.pdf`.

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

Remove `RESEND_API_KEY` from `.env` — server will score + build PDF but skip email and still return `200`.

### Test without AI (no Anthropic key)

Remove `ANTHROPIC_API_KEY` from `.env` — server uses a static fallback plan automatically. Still returns `200` and sends the email.

### Health check

```bash
curl http://localhost:5000/api/health
```

---

## Deployment (Vercel)

Both frontend and backend deploy to Vercel as separate projects.

### Backend

1. Push repo to GitHub.
2. Import the repo in Vercel → set **Root Directory** to `backend/`.
3. Framework preset: **Other**. Build command: `npm run build`. Output: `dist/`.
4. Add all environment variables from `.env.example` in the Vercel dashboard.
5. The `vercel.json` in `backend/` handles serverless routing automatically.

### Frontend

1. Import the same repo in a second Vercel project → set **Root Directory** to `frontend/`.
2. Framework preset: **Vite**.
3. Add environment variable: `VITE_API_URL=https://your-backend.vercel.app`

### After deploying both

- Set `FRONTEND_URLS` on the backend to your frontend Vercel URL (for CORS).
- Verify with: `curl https://your-backend.vercel.app/api/health`

---

## Out of Scope (Do Not Add)

Per the technical spec:

- ❌ Database or persistent storage of any kind
- ❌ User accounts or authentication
- ❌ Score display on screen (score lives in PDF only)
- ❌ More than one endpoint
- ❌ More than 10 questions
- ❌ Payments, subscriptions, admin portals
- ❌ Real-time chat
