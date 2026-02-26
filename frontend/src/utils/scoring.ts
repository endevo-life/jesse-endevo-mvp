import { UserAnswers } from "../types";
import { QUESTIONS, getTier, getTierKey } from "../data/questions";

export function calculateScore(answers: UserAnswers): number {
  return Object.values(answers).reduce((sum, a) => sum + a.score, 0);
}

export function getDomainBreakdown(answers: UserAnswers) {
  const domains: Record<string, { raw: number; max: number; pct: number }> = {
    "Access & Ownership Risk": { raw: 0, max: 0, pct: 0 },
    "Data Loss Risk": { raw: 0, max: 0, pct: 0 },
    "Platform Limitation Risk": { raw: 0, max: 0, pct: 0 },
    "Stewardship Risk": { raw: 0, max: 0, pct: 0 },
  };

  QUESTIONS.forEach((q) => {
    const domain = q.domain;
    if (!domains[domain]) return;
    const maxScore = 10; // each question max is 10
    domains[domain].max += maxScore;
    const ans = answers[q.id];
    if (ans) domains[domain].raw += ans.score;
  });

  Object.keys(domains).forEach((d) => {
    const dom = domains[d];
    dom.pct = dom.max > 0 ? Math.round((dom.raw / dom.max) * 100) : 0;
  });

  return domains;
}

export function getLowestDomain(
  breakdown: ReturnType<typeof getDomainBreakdown>
) {
  let lowest = "";
  let lowestPct = 101;
  Object.entries(breakdown).forEach(([domain, data]) => {
    if (data.pct < lowestPct) {
      lowestPct = data.pct;
      lowest = domain;
    }
  });
  return lowest;
}

export { getTier, getTierKey };
