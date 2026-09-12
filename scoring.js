export const DIMENSIONS = [
  { key: 'power_energy', label: 'Power & Energy', short: 'Power' },
  { key: 'incentives_tax', label: 'Incentives & Tax', short: 'Tax' },
  { key: 'local', label: 'Local', short: 'Local' },
  { key: 'political_regulatory', label: 'Political & Regulatory', short: 'Political' },
  { key: 'water_environmental', label: 'Water & Environmental', short: 'Environment' },
];

export function overallPolicyScore(scores) {
  const vals = DIMENSIONS.map(d => Number(scores[d.key]));
  if (vals.some(v => Number.isNaN(v) || v < 1 || v > 5)) throw new Error('Scores must be 1.0-5.0');
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 20);
}

export function scoreBand(score) {
  if (score >= 80) return 'Favorable';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Challenging';
  return 'Restrictive';
}

export function heatmapCommunityScore(index) {
  const x = Number(index);
  if (Number.isNaN(x)) return null;
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

export function roundHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

export function countyLocalScore({ community_score, local_policy_entitlements_score, development_precedent_score }) {
  const raw = Number(community_score) * 0.40 + Number(local_policy_entitlements_score) * 0.50 + Number(development_precedent_score) * 0.10;
  return { raw: Number(raw.toFixed(2)), rounded: roundHalf(raw) };
}
