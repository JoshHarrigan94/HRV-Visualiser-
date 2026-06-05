export type HrvState = "restored" | "adaptive" | "loaded" | "strained";

export function getDelta(rmssd: number, baseline: number): number {
  return ((rmssd - baseline) / baseline) * 100;
}

export function getStateFromDelta(delta: number): HrvState {
  if (delta >= 10) return "restored";
  if (delta >= -10) return "adaptive";
  if (delta >= -25) return "loaded";
  return "strained";
}

export function getStateLabel(state: HrvState): string {
  return {
    restored: "Restored",
    adaptive: "Adaptive",
    loaded: "Loaded",
    strained: "Strained",
  }[state];
}

export function getYFromDelta(delta: number): number {
  const clamped = Math.max(-40, Math.min(20, delta));
  const t = (20 - clamped) / 60;

  return 55 + t * 390;
}