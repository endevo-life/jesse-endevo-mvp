# Jesse — Digital Continuity Scanner
**ENDevo Hackathon MVP | Demo: March 8, 2026**

Built for Jim. For every family that shouldn't have to figure this out alone.

## Team
| Role | Person | Branch |
|------|--------|--------|
| Tech Lead / DevOps | Nermeen | `main` |
| Frontend (React) | Karna | `feature/frontend-*` |
| Backend (Node + MongoDB) | Aryan | `feature/backend-*` |
| UAT  | Jim & Anna | URL : TBD
| PM | Niki | — |

## Stack
- **Frontend**: React.js + TypeScript → Vercel
- **Backend**: Node.js + Express + MongoDB
- **AI**: Anthropic API (Claude)
- **CI/CD**: GitHub Actions → Vercel

## Branch Rules
- `main` → production (protected, requires PR + approval)
- `dev` → integration (merge here first)
- `feature/your-task` → your work

## Getting Started
```bash
# Frontend
cd frontend && npm install && npm start

# Backend
cd backend && npm install && npm run dev
```

## Env Files
Copy `.env.example` → `.env` and fill in values.
Never commit `.env` files.
