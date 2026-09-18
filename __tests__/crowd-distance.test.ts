import { describe, expect, it } from "vitest";
import {
  haversineDistanceMeters,
  isVerifiedNearNode,
  NEAR_NODE_THRESHOLD_METERS,
} from "@/lib/crowd/distance";

describe("haversineDistanceMeters", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineDistanceMeters(40.3777, 49.892, 40.3777, 49.892)).toBeCloseTo(0, 3);
  });

  it("returns a plausible distance between two known Baku-area points", () => {
    // Roughly 28 May <-> Nizami metro stations, a few hundred meters apart.
    const distance = haversineDistanceMeters(40.3725, 49.8442, 40.3754, 49.8412);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(1000);
  });
});

describe("isVerifiedNearNode", () => {
  it("verifies distances within the threshold", () => {
    expect(isVerifiedNearNode(0)).toBe(true);
    expect(isVerifiedNearNode(NEAR_NODE_THRESHOLD_METERS)).toBe(true);
  });

  it("rejects distances beyond the threshold", () => {
    expect(isVerifiedNearNode(NEAR_NODE_THRESHOLD_METERS + 1)).toBe(false);
  });
});
