// Domain weights for scoring
export const DOMAIN_WEIGHTS = {
  ACCESS: 0.30,
  DATA_LOSS: 0.20,
  FINANCIAL: 0.20,
  PLATFORM: 0.15,
  STEWARDSHIP: 0.15,
} as const;

// Tier thresholds
export const TIERS = {
  RED: { min: 0, max: 25, label: 'Critical Risk' },
  ORANGE: { min: 26, max: 50, label: 'High Risk' },
  YELLOW: { min: 51, max: 75, label: 'Moderate Risk' },
  GREEN: { min: 76, max: 100, label: 'Low Risk' },
} as const;

// TODO: Add Jim's 12 questions here
export const QUESTIONS = [
  // Example structure:
  // { id: 1, text: 'Question text?', domain: 'ACCESS', weight: 0.3 }
];
