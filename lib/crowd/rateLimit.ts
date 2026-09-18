export const RATE_LIMIT_MINUTES = 5;

/**
 * Pure predicate used by the API route to fail fast with a friendly error.
 * The database trigger `enforce_crowd_report_rate_limit` (0005_crowd_reports.sql)
 * is the actual source of truth — this check must never be trusted alone,
 * since it only protects against accidental double-submits from the same
 * request path, not a client that skips the API route entirely.
 */
export function isRateLimited(lastReportAt: Date | null, now: Date = new Date()): boolean {
  if (!lastReportAt) return false;
  const minutesSince = (now.getTime() - lastReportAt.getTime()) / 60_000;
  return minutesSince < RATE_LIMIT_MINUTES;
}

export function minutesUntilAllowed(lastReportAt: Date | null, now: Date = new Date()): number {
  if (!lastReportAt) return 0;
  const minutesSince = (now.getTime() - lastReportAt.getTime()) / 60_000;
  return Math.max(0, RATE_LIMIT_MINUTES - minutesSince);
}
