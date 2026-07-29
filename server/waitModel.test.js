import { describe, expect, it } from "vitest";
import { buildWaitEstimates, predictServiceDuration } from "./waitModel.js";

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);

function historySamples({
  count,
  serviceId = "hair",
  deskId = "1",
  memberId = "member-1",
  serviceMs = 5 * MINUTE,
  hour = 10,
}) {
  return Array.from({ length: count }, (_, index) => ({
    serviceId,
    deskId,
    memberId,
    serviceMs,
    completedAt: Date.UTC(2026, 6, 28 - index, hour, 0, 0),
  }));
}

describe("adaptive wait model", () => {
  it("learns different service speeds for individual members", () => {
    const history = [
      ...historySamples({ count: 16, memberId: "fast", deskId: "1", serviceMs: 2 * MINUTE }),
      ...historySamples({ count: 16, memberId: "slow", deskId: "2", serviceMs: 9 * MINUTE }),
    ];

    const fast = predictServiceDuration(history, {
      serviceId: "hair",
      deskId: "1",
      memberId: "fast",
      createdAt: NOW,
    }, { now: NOW });
    const slow = predictServiceDuration(history, {
      serviceId: "hair",
      deskId: "2",
      memberId: "slow",
      createdAt: NOW,
    }, { now: NOW });

    expect(fast.expectedMs).toBeLessThan(slow.expectedMs);
    expect(slow.expectedMs - fast.expectedMs).toBeGreaterThan(3 * MINUTE);
    expect(fast.sources).toContain("member-service");
  });

  it("learns time-of-day patterns for the same service", () => {
    const history = [
      ...historySamples({ count: 18, serviceMs: 3 * MINUTE, hour: 9 }),
      ...historySamples({ count: 18, serviceMs: 8 * MINUTE, hour: 17 }),
    ];
    const morning = predictServiceDuration(history, {
      serviceId: "hair",
      deskId: "new-counter",
      createdAt: Date.UTC(2026, 6, 29, 9, 0, 0),
    }, { now: NOW });
    const afternoon = predictServiceDuration(history, {
      serviceId: "hair",
      deskId: "new-counter",
      createdAt: Date.UTC(2026, 6, 29, 17, 0, 0),
    }, { now: NOW });

    expect(morning.expectedMs).toBeLessThan(afternoon.expectedMs);
    expect(afternoon.expectedMs - morning.expectedMs).toBeGreaterThan(MINUTE);
    expect(morning.sources).toContain("service-time");
  });

  it("adds remaining active work and every ticket ahead", () => {
    const history = historySamples({ count: 30, serviceMs: 5 * MINUTE });
    const estimates = buildWaitEstimates({
      history,
      now: NOW,
      tickets: [
        {
          id: "serving",
          label: "A001",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          memberId: "member-1",
          status: "serving",
          createdAt: NOW - 10 * MINUTE,
          startedAt: NOW - 2 * MINUTE,
        },
        {
          id: "general",
          label: "A002",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW - 4 * MINUTE,
        },
        {
          id: "priority",
          label: "P001",
          type: "priority",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW - MINUTE,
        },
      ],
    });
    const serving = estimates.tickets.find((ticket) => ticket.submissionId === "serving");
    const priority = estimates.tickets.find((ticket) => ticket.submissionId === "priority");
    const general = estimates.tickets.find((ticket) => ticket.submissionId === "general");

    expect(serving.estimatedWaitMs).toBe(0);
    expect(priority.ticketsAhead).toBe(1);
    expect(priority.estimatedWaitMs).toBeGreaterThan(MINUTE);
    expect(general.ticketsAhead).toBe(2);
    expect(general.estimatedWaitMs).toBeGreaterThan(priority.estimatedWaitMs + 3 * MINUTE);
  });

  it("raises confidence as relevant completed services accumulate", () => {
    const sparse = predictServiceDuration(
      historySamples({ count: 2 }),
      { serviceId: "hair", deskId: "1", memberId: "member-1", createdAt: NOW },
      { now: NOW },
    );
    const mature = predictServiceDuration(
      historySamples({ count: 40 }),
      { serviceId: "hair", deskId: "1", memberId: "member-1", createdAt: NOW },
      { now: NOW },
    );

    expect(sparse.confidence).toBe("low");
    expect(mature.confidence).toBe("high");
    expect(mature.confidenceScore).toBeGreaterThan(sparse.confidenceScore);
  });

  it("keeps the same target time after a page refresh", () => {
    const history = historySamples({ count: 30, serviceMs: 5 * MINUTE });
    const tickets = [
      {
        id: "first",
        label: "A001",
        type: "general",
        serviceId: "hair",
        deskId: "1",
        status: "queued",
        createdAt: NOW,
      },
      {
        id: "second",
        label: "A002",
        type: "general",
        serviceId: "hair",
        deskId: "1",
        status: "queued",
        createdAt: NOW,
      },
    ];
    const firstLoad = buildWaitEstimates({
      history,
      tickets,
      forecastAt: NOW,
      now: NOW + MINUTE,
    }).tickets.find((ticket) => ticket.submissionId === "second");
    const refreshed = buildWaitEstimates({
      history,
      tickets,
      forecastAt: NOW,
      now: NOW + 2 * MINUTE,
    }).tickets.find((ticket) => ticket.submissionId === "second");

    expect(refreshed.predictedStartAt).toBe(firstLoad.predictedStartAt);
    expect(refreshed.estimatedWaitMs).toBe(firstLoad.estimatedWaitMs - MINUTE);
  });

  it("freezes wait estimates while the assigned counter is on break", () => {
    const estimates = buildWaitEstimates({
      history: historySamples({ count: 30, serviceMs: 5 * MINUTE }),
      tickets: [
        {
          id: "first",
          label: "A001",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW,
        },
        {
          id: "second",
          label: "A002",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW + 1,
        },
      ],
      desks: [{
        id: "1",
        onBreak: true,
        breakStartedAt: NOW + MINUTE,
        waitForecastChangedAt: NOW + MINUTE,
      }],
      forecastAt: NOW,
      now: NOW + 4 * MINUTE,
    }).tickets.find((ticket) => ticket.submissionId === "second");

    expect(estimates.paused).toBe(true);
    expect(estimates.pauseStartedAt).toBe(NOW + MINUTE);
    expect(estimates.estimatedWaitMs).toBeGreaterThan(4 * MINUTE);
  });

  it("keeps a realistic minimum for tickets behind an overdue service", () => {
    const estimates = buildWaitEstimates({
      history: historySamples({ count: 30, serviceMs: 5 * MINUTE }),
      tickets: [
        {
          id: "serving",
          label: "A001",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          memberId: "member-1",
          status: "serving",
          createdAt: NOW - MINUTE,
          startedAt: NOW,
        },
        {
          id: "first",
          label: "A002",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW,
        },
        {
          id: "second",
          label: "A003",
          type: "general",
          serviceId: "hair",
          deskId: "1",
          status: "queued",
          createdAt: NOW + 1,
        },
      ],
      forecastAt: NOW,
      now: NOW,
    }).tickets;
    const first = estimates.find((ticket) => ticket.submissionId === "first");
    const second = estimates.find((ticket) => ticket.submissionId === "second");

    expect(first.delayAt).toBeGreaterThan(NOW);
    expect(first.minimumWaitMs).toBe(MINUTE);
    expect(first.positionStepStartedAt).toBe(NOW);
    expect(first.positionStepEndsAt).toBe(first.predictedStartAt);
    expect(second.minimumWaitMs).toBeGreaterThan(5 * MINUTE);
    expect(second.positionStepStartedAt).toBe(first.positionStepStartedAt);
    expect(second.positionStepEndsAt).toBe(first.positionStepEndsAt);
  });
});
