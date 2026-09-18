/**
 * Central place for every "magic number" the routing engine uses to turn a
 * raw shortest path into a user-facing recommendation. Change weights here,
 * not scattered across the codebase (spec requirement).
 */
export const ROUTING_CONFIG = {
  /** Minutes added per transfer beyond the first leg of the journey. */
  transferPenaltyMinutes: 8,
  /** Minutes added depending on the current crowd level of a route leg. */
  crowdPenaltyMinutes: {
    green: 0,
    yellow: 5,
    red: 15,
    unknown: 3,
  } satisfies Record<"green" | "yellow" | "red" | "unknown", number>,
  /** Multiplier applied to actual walking minutes when scoring a route. */
  walkingPenaltyMultiplier: 1.5,
  /** Extra minutes of safety buffer added on top of estimated duration when
   * recommending a departure time for a desired arrival time. */
  arrivalSafetyBufferMinutes: 5,
  /** Maximum number of alternative routes ever returned to the client. */
  maxAlternatives: 3,
} as const;

export type CrowdPenaltyKey = keyof typeof ROUTING_CONFIG.crowdPenaltyMinutes;
