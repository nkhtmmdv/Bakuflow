import { describe, expect, it } from "vitest";
import { isRateLimited, minutesUntilAllowed, RATE_LIMIT_MINUTES } from "@/lib/crowd/rateLimit";

const NOW = new Date("2026-01-01T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

describe("isRateLimited", () => {
  it("allows a first-ever report", () => {
    expect(isRateLimited(null, NOW)).toBe(false);
  });

  it("blocks a report submitted moments after the previous one", () => {
    expect(isRateLimited(minutesAgo(1), NOW)).toBe(true);
  });

  it("blocks right up to the boundary", () => {
    expect(isRateLimited(minutesAgo(RATE_LIMIT_MINUTES - 0.01), NOW)).toBe(true);
  });

  it("allows a report once the window has fully elapsed", () => {
    expect(isRateLimited(minutesAgo(RATE_LIMIT_MINUTES), NOW)).toBe(false);
    expect(isRateLimited(minutesAgo(RATE_LIMIT_MINUTES + 1), NOW)).toBe(false);
  });
});

describe("minutesUntilAllowed", () => {
  it("is zero when there is no prior report", () => {
    expect(minutesUntilAllowed(null, NOW)).toBe(0);
  });

  it("counts down the remaining wait", () => {
    expect(minutesUntilAllowed(minutesAgo(2), NOW)).toBeCloseTo(3);
  });

  it("never goes negative once the window has passed", () => {
    expect(minutesUntilAllowed(minutesAgo(999), NOW)).toBe(0);
  });
});
