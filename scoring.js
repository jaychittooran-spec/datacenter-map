// STACK Policy Intelligence: four-factor Balanced Development model.
export const DIMENSIONS = [
  { key: 'power_energy', label: 'Power & Energy', short: 'Power', weight: 0.35 },
  { key: 'water', label: 'Water', short: 'Water', weight: 0.15 },
  { key: 'policy_regulatory_environment', label: 'Policy & Regulatory Environment', short: 'Policy', weight: 0.25 },
  { key: 'community_sentiment', label: 'Community Sentiment', short: 'Community', weight: 0.25 },
];

export function overallPolicyScore(scores) {
  let total = 0;
  for (const d of DIMENSIONS) {
    const value = scores?.[d.key];
    if (value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 1 || Number(value) > 5 || !Number.isInteger(Number(value) * 2)) {
      throw new Error(`Invalid ${d.label} score: expected 1.0-5.0 in half-point increments`);
    }
    total += Number(value) * d.weight;
  }
  return Math.round(total * 20 * 10) / 10;
}

export function scoreBand(score) {
  if (score >= 80) return 'Favorable';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Challenging';
  return 'Restrictive';
}

export function heatmapCommunityScore(index) {
  const x = Number(index);
  if (index == null || index === '' || !Number.isFinite(x)) return null;
  if (x <= 20) return 5.0;
  if (x <= 30) return 4.5;
  if (x <= 40) return 4.0;
  if (x <= 50) return 3.5;
  if (x <= 60) return 3.0;
  if (x <= 70) return 2.5;
  if (x <= 80) return 2.0;
  if (x <= 90) return 1.5;
  return 1.0;
}

export function roundHalf(value) { return Math.round(Number(value) * 2) / 2; }

// Legacy county context metric; it does not automatically set state Community Sentiment.
export function countyLocalScore({ community_score, local_policy_entitlements_score, development_precedent_score }) {
  const raw = Number(community_score) * 0.40 + Number(local_policy_entitlements_score) * 0.50 + Number(development_precedent_score) * 0.10;
  return { raw: Number(raw.toFixed(2)), rounded: roundHalf(raw) };
}
