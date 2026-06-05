export function calculateRMSSD(rrIntervals: number[]): number | null {
  if (rrIntervals.length < 3) return null;

  let sum = 0;

  for (let i = 1; i < rrIntervals.length; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sum += diff * diff;
  }

  return Math.sqrt(sum / (rrIntervals.length - 1));
}

export function estimateHeartRate(rrIntervals: number[]): number | null {
  if (!rrIntervals.length) return null;

  const recent = rrIntervals.slice(-5);
  const avgRR = recent.reduce((sum, rr) => sum + rr, 0) / recent.length;

  return Math.round(60000 / avgRR);
}