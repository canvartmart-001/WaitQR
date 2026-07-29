import { describe, expect, it } from "vitest";
import { countdownLabel, waitEstimateDisplay } from "./format";

describe("wait countdown formatting", () => {
  it("counts down using seconds and minutes below one hour", () => {
    expect(countdownLabel(45_250)).toBe("46s");
    expect(countdownLabel(61_000)).toBe("1m 1s");
  });

  it("uses compact hours for longer waits", () => {
    expect(countdownLabel(3_661_000)).toBe("1h 1m");
    expect(countdownLabel(7_200_000)).toBe("2h");
  });
});

describe("wait estimate display state", () => {
  it("freezes the countdown at the moment a counter starts a break", () => {
    const estimate = {
      predictedStartAt: 10 * 60_000,
      paused: true,
      pauseStartedAt: 4 * 60_000,
    };

    expect(waitEstimateDisplay(estimate, 8 * 60_000)).toEqual({
      waitMs: 6 * 60_000,
      paused: true,
      delayed: false,
    });
  });

  it("holds an overdue forecast at its minimum remaining wait", () => {
    const estimate = {
      predictedStartAt: 5 * 60_000,
      delayAt: 3 * 60_000,
      minimumWaitMs: 2 * 60_000,
    };

    expect(waitEstimateDisplay(estimate, 7 * 60_000)).toEqual({
      waitMs: 2 * 60_000,
      paused: false,
      delayed: true,
    });
  });
});
