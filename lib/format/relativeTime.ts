/** Formats "N мин/dəq" for the small delta the app deals in (crowd freshness). */
export function formatMinutesAgo(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
}
