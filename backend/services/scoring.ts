import type { Answer, AnswerLetter, DomainScores, ScoringResult } from '../types/index';

// ── Point values per answer ───────────────────────────────────────────────────
const POINTS: Record<AnswerLetter, number> = { A: 10, B: 6, C: 3, D: 0 };

// ── Domain mapping (Q number → domain key) ───────────────────────────────────
// Financial Exposure (20%) is deferred to Phase 2; weight redistributed.
// Q10 (handover speed) kept in Access & Ownership per the POMA spec.
const Q_DOMAIN: Record<number, keyof DomainScores> = {
  1:  'access_ownership',     // phone access
  2:  'access_ownership',     // password count
  3:  'data_loss',            // social media fate
  4:  'platform_limitation',  // digital legacy manager
  5:  'stewardship',          // wishes shared
  6:  'access_ownership',     // password manager
  7:  'stewardship',          // document storage
  8:  'data_loss',            // cloud backup
  9:  'platform_limitation',  // 2FA
  10: 'access_ownership',     // handover speed (lead qualifier)
};

// Max raw points per domain given the question distribution above
const DOMAIN_MAX: DomainScores = {
  access_ownership:    40, // Q1+Q2+Q6+Q10 → 4 × 10
  data_loss:           20, // Q3+Q8         → 2 × 10
  platform_limitation: 20, // Q4+Q9         → 2 × 10
  stewardship:         20, // Q5+Q7         → 2 × 10
};

// ── Tier thresholds ───────────────────────────────────────────────────────────
interface Tier {
  min:   number;
  max:   number;
  label: string;
}

const TIERS: Tier[] = [
  { min: 85, max: 100, label: 'Peace Champion'  },
  { min: 60, max: 84,  label: 'On Your Way'     },
  { min: 35, max: 59,  label: 'Getting Clarity' },
  { min: 0,  max: 34,  label: 'Starting Fresh'  },
];

// ── Human-readable signal per question for C and D answers ───────────────────
type SignalAnswers = Partial<Record<'C' | 'D', string>>;

const SIGNALS: Record<number, SignalAnswers> = {
  1:  { D: 'No legacy contact set up — loved ones cannot access your phone',
        C: 'Phone access is informal — needs a formal Legacy Contact' },
  2:  { D: 'Password volume completely unmanaged — no system in place',
        C: 'High password count with no central system — manager needed' },
  3:  { D: 'No idea what happens to social media accounts after death',
        C: 'Aware of the social media issue but no action taken' },
  4:  { D: 'No digital legacy manager designated — accounts have no backup plan',
        C: 'Digital legacy not yet assigned — still on the to-do list' },
  5:  { D: 'Wishes unknown to family — creates burden and guesswork',
        C: 'Wishes not yet clearly defined or documented' },
  6:  { D: 'No password manager — digital security has no foundation',
        C: 'Password manager unused or outdated — needs attention' },
  7:  { D: 'Important documents unknown or inaccessible',
        C: 'Documents scattered across formats — no unified system' },
  8:  { D: 'No cloud backup — data loss risk is critical',
        C: 'Cloud backup partial — critical files still at risk' },
  9:  { D: '2FA not set up — accounts are vulnerable',
        C: '2FA only partially configured — key accounts still exposed' },
  10: { D: 'Digital handover would be nearly impossible — highest urgency',
        C: 'Handover would require a full day of serious effort' },
};

// ── Score a completed assessment ──────────────────────────────────────────────
export function score(answers: Answer[]): ScoringResult {
  console.log(`[Scoring] Calculating score for ${answers.length} answers`);

  const domainRaw: DomainScores = {
    access_ownership:    0,
    data_loss:           0,
    platform_limitation: 0,
    stewardship:         0,
  };

  let total = 0;
  const criticalGaps: string[] = [];
  const jesseSignals: string[] = [];

  for (const { q, answer } of answers) {
    const pts = POINTS[answer] ?? 0;
    total += pts;

    const domain = Q_DOMAIN[q];
    if (domain) domainRaw[domain] += pts;

    if (answer === 'D' || answer === 'C') {
      criticalGaps.push(`Q${q}-${answer}`);
      const sig = SIGNALS[q]?.[answer as 'C' | 'D'];
      if (sig) jesseSignals.push(sig);
    }
  }

  const tierObj = TIERS.find(t => total >= t.min && total <= t.max) ?? TIERS[TIERS.length - 1];

  let lowestDomain: keyof DomainScores = 'access_ownership';
  let lowestPct = Infinity;
  for (const [domain, raw] of Object.entries(domainRaw) as [keyof DomainScores, number][]) {
    const pct = raw / DOMAIN_MAX[domain];
    if (pct < lowestPct) { lowestPct = pct; lowestDomain = domain; }
  }

  console.log(`[Scoring] Result: ${total}/100, Tier: "${tierObj.label}", Gaps: ${criticalGaps.length}, Weakest domain: ${lowestDomain}`);

  return {
    readiness_score: total,
    tier:            tierObj.label,
    domain_scores:   domainRaw,
    critical_gaps:   criticalGaps,
    jesse_signals:   jesseSignals,
    lowest_domain:   lowestDomain,
  };
}
