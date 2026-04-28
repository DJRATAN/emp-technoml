/** Compute a leave-approval deadline timestamp (ms) from request creation + SLA hours. */
export function leaveDeadlineMs(createdAt: string, slaHours: number) {
  return new Date(createdAt).getTime() + slaHours * 3600_000;
}

/** Human-readable countdown ("4h 12m left", "Overdue by 3h"). */
export function formatRemaining(deadlineMs: number, nowMs = Date.now()) {
  const diff = deadlineMs - nowMs;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const compact = h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : `${h}h ${m}m`;
  return diff >= 0 ? `${compact} left` : `Overdue by ${compact}`;
}

/** Returns 'safe' | 'soon' | 'overdue' */
export function deadlineSeverity(deadlineMs: number, nowMs = Date.now()): 'safe' | 'soon' | 'overdue' {
  const diff = deadlineMs - nowMs;
  if (diff < 0) return 'overdue';
  if (diff < 6 * 3600_000) return 'soon';
  return 'safe';
}
