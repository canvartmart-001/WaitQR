const MIN_SERVICE_MS = 15_000;
const MAX_SERVICE_MS = 4 * 60 * 60 * 1000;
const DEFAULT_SERVICE_MS = 5 * 60 * 1000;
const RECENCY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
const CALL_BUFFER_MS = 30_000;
const MIN_OVERRUN_WAIT_MS = 60_000;

export const WAIT_MODEL_VERSION = "adaptive-hierarchical-v1";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

function quantile(sortedValues, fraction) {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

function zonedTimeParts(timestamp, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(new Date(timestamp));
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const weekday = parts.find((part) => part.type === "weekday")?.value || "Mon";
    return {
      dayType: weekday === "Sat" || weekday === "Sun" ? "weekend" : "weekday",
      timeBucket: Math.floor(hour / 4),
    };
  } catch {
    const date = new Date(timestamp);
    return {
      dayType: date.getUTCDay() === 0 || date.getUTCDay() === 6 ? "weekend" : "weekday",
      timeBucket: Math.floor(date.getUTCHours() / 4),
    };
  }
}

function normalizeHistory(history, now, timeZone) {
  return history
    .map((sample) => {
      const serviceMs = finiteNumber(sample.serviceMs);
      const completedAt = finiteNumber(sample.completedAt, now);
      if (serviceMs < MIN_SERVICE_MS || serviceMs > MAX_SERVICE_MS) return null;
      return {
        ...sample,
        serviceMs,
        completedAt,
        ...zonedTimeParts(finiteNumber(sample.startedAt, completedAt), timeZone),
      };
    })
    .filter(Boolean);
}

function weightedStats(samples, now) {
  if (samples.length === 0) return null;

  const sortedDurations = samples.map((sample) => sample.serviceMs).sort((a, b) => a - b);
  const shouldWinsorize = sortedDurations.length >= 8;
  const lowerBound = shouldWinsorize ? quantile(sortedDurations, 0.1) : MIN_SERVICE_MS;
  const upperBound = shouldWinsorize ? quantile(sortedDurations, 0.9) : MAX_SERVICE_MS;
  let totalWeight = 0;
  let weightedTotal = 0;
  const weightedSamples = samples.map((sample) => {
    const ageMs = Math.max(0, now - sample.completedAt);
    const weight = Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);
    const value = Math.min(Math.max(sample.serviceMs, lowerBound), upperBound);
    totalWeight += weight;
    weightedTotal += value * weight;
    return { value, weight };
  });
  const mean = weightedTotal / Math.max(totalWeight, Number.EPSILON);
  const variance = weightedSamples.reduce(
    (sum, sample) => sum + sample.weight * Math.pow(sample.value - mean, 2),
    0,
  ) / Math.max(totalWeight, Number.EPSILON);

  return {
    mean,
    standardDeviation: Math.sqrt(Math.max(0, variance)),
    sampleCount: samples.length,
    effectiveCount: totalWeight,
  };
}

function candidate(samples, now, priority, evidenceTarget, source) {
  const stats = weightedStats(samples, now);
  if (!stats) return null;
  const evidence = 1 - Math.exp(-stats.effectiveCount / evidenceTarget);
  return {
    ...stats,
    evidence,
    blendWeight: priority * evidence,
    source,
  };
}

function predictFromNormalizedHistory(
  samples,
  ticket,
  {
    now = Date.now(),
    timeZone = "UTC",
    defaultServiceMs = DEFAULT_SERVICE_MS,
  } = {},
) {
  const targetTime = finiteNumber(ticket.predictionAt ?? ticket.createdAt, now);
  const targetParts = zonedTimeParts(targetTime, timeZone);
  const serviceSamples = samples.filter((sample) => sameId(sample.serviceId, ticket.serviceId));
  const candidates = [
    candidate(
      serviceSamples.filter(
        (sample) => sameId(sample.memberId, ticket.memberId) && sameId(sample.serviceId, ticket.serviceId),
      ),
      now,
      10,
      6,
      "member-service",
    ),
    candidate(
      serviceSamples.filter(
        (sample) => sameId(sample.deskId, ticket.deskId) && sameId(sample.serviceId, ticket.serviceId),
      ),
      now,
      8,
      8,
      "counter-service",
    ),
    candidate(
      serviceSamples.filter(
        (sample) => sample.dayType === targetParts.dayType && sample.timeBucket === targetParts.timeBucket,
      ),
      now,
      7,
      10,
      "service-time",
    ),
    candidate(
      serviceSamples.filter((sample) => sample.dayType === targetParts.dayType),
      now,
      4,
      12,
      "service-day",
    ),
    candidate(serviceSamples, now, 6, 14, "service"),
    candidate(samples.filter((sample) => sameId(sample.memberId, ticket.memberId)), now, 2.5, 12, "member"),
    candidate(samples.filter((sample) => sameId(sample.deskId, ticket.deskId)), now, 2, 14, "counter"),
    candidate(samples, now, 1, 20, "global"),
  ].filter(Boolean);

  const defaultWeight = candidates.length === 0 ? 1 : 0.35;
  const totalWeight = candidates.reduce((sum, item) => sum + item.blendWeight, defaultWeight);
  const expectedMs = Math.round(
    candidates.reduce((sum, item) => sum + item.mean * item.blendWeight, defaultServiceMs * defaultWeight)
      / Math.max(totalWeight, Number.EPSILON),
  );
  const specificEvidence = Math.max(
    0,
    ...candidates
      .filter((item) => ["member-service", "counter-service", "service-time", "service"].includes(item.source))
      .map((item) => item.evidence),
  );
  const confidenceScore = Math.min(0.99, specificEvidence);
  const modelVariance = candidates.reduce(
    (sum, item) => sum + item.blendWeight * (
      Math.pow(item.standardDeviation, 2) + Math.pow(item.mean - expectedMs, 2)
    ),
    0,
  ) / Math.max(totalWeight - defaultWeight, 1);
  const learnedSpread = Math.sqrt(Math.max(0, modelVariance));
  const confidenceFloor = expectedMs * (0.55 - 0.3 * confidenceScore);
  const spread = Math.max(30_000, learnedSpread, confidenceFloor);

  return {
    expectedMs: Math.max(MIN_SERVICE_MS, expectedMs),
    lowerMs: Math.max(MIN_SERVICE_MS, Math.round(expectedMs - spread)),
    upperMs: Math.min(MAX_SERVICE_MS, Math.round(expectedMs + spread)),
    confidence: confidenceScore >= 0.72 ? "high" : confidenceScore >= 0.35 ? "medium" : "low",
    confidenceScore: Number(confidenceScore.toFixed(3)),
    sampleCount: serviceSamples.length,
    sources: candidates
      .sort((left, right) => right.blendWeight - left.blendWeight)
      .slice(0, 3)
      .map((item) => item.source),
  };
}

export function predictServiceDuration(
  history,
  ticket,
  options = {},
) {
  const now = options.now ?? Date.now();
  const timeZone = options.timeZone || "UTC";
  return predictFromNormalizedHistory(
    normalizeHistory(history, now, timeZone),
    ticket,
    { ...options, now, timeZone },
  );
}

function queueOrder(left, right) {
  const statusRank = { serving: 0, called: 1, queued: 2 };
  const statusDifference = (statusRank[left.status] ?? 3) - (statusRank[right.status] ?? 3);
  if (statusDifference !== 0) return statusDifference;

  if (left.status === "queued" && right.status === "queued") {
    const priorityDifference = (left.type === "priority" ? 0 : 1) - (right.type === "priority" ? 0 : 1);
    if (priorityDifference !== 0) return priorityDifference;
  }

  const leftTime = finiteNumber(left.startedAt || left.calledAt || left.createdAt);
  const rightTime = finiteNumber(right.startedAt || right.calledAt || right.createdAt);
  if (leftTime !== rightTime) return leftTime - rightTime;
  return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
}

function confidenceForQueue(predictions) {
  if (predictions.length === 0) return "low";
  const score = predictions.reduce((sum, prediction) => sum + prediction.confidenceScore, 0) / predictions.length;
  return score >= 0.72 ? "high" : score >= 0.35 ? "medium" : "low";
}

export function buildWaitEstimates({
  history = [],
  tickets = [],
  desks = [],
  now = Date.now(),
  forecastAt = now,
  timeZone = "UTC",
  defaultServiceMs = DEFAULT_SERVICE_MS,
} = {}) {
  const modelAt = Math.min(now, finiteNumber(forecastAt, now));
  const normalizedHistory = normalizeHistory(history, modelAt, timeZone);
  const activeTickets = tickets.filter((ticket) => ["queued", "called", "serving"].includes(ticket.status));
  const ticketsByDesk = activeTickets.reduce((result, ticket) => {
    const deskId = ticket.deskId == null ? "__unassigned__" : String(ticket.deskId);
    result.set(deskId, [...(result.get(deskId) || []), ticket]);
    return result;
  }, new Map());
  const ticketEstimates = [];
  const counterEstimates = [];
  const desksById = new Map(desks.map((desk) => [String(desk.id), desk]));

  for (const [deskId, deskTickets] of ticketsByDesk) {
    const desk = deskId === "__unassigned__" ? null : desksById.get(deskId);
    const pauseStartedAt = desk?.onBreak
      ? finiteNumber(desk.breakStartedAt, now)
      : null;
    const deskForecastAt = Math.max(modelAt, finiteNumber(desk?.waitForecastChangedAt, modelAt));
    const deskModelAt = pauseStartedAt == null
      ? Math.min(now, deskForecastAt)
      : Math.min(now, Math.max(deskForecastAt, pauseStartedAt));
    const displayNow = pauseStartedAt == null ? now : Math.min(now, pauseStartedAt);
    const orderedTickets = [...deskTickets].sort(queueOrder);
    let expectedCursorAt = deskModelAt;
    let lowerCursorAt = deskModelAt;
    let upperCursorAt = deskModelAt;
    let ticketsAhead = 0;
    let delayAt = null;
    let workAheadAfterDelayMs = 0;
    let queueStepStartedAt = null;
    let queueStepEndsAt = null;
    const predictions = [];

    for (const ticket of orderedTickets) {
      const servingStartAt = finiteNumber(ticket.startedAt, deskModelAt);
      const calledReadyAt = finiteNumber(ticket.calledAt, deskModelAt) + CALL_BUFFER_MS;
      const expectedStartAt = ticket.status === "serving"
        ? servingStartAt
        : ticket.status === "called"
          ? Math.max(expectedCursorAt, calledReadyAt)
          : expectedCursorAt;
      const lowerStartAt = ticket.status === "serving"
        ? servingStartAt
        : ticket.status === "called"
          ? Math.max(lowerCursorAt, finiteNumber(ticket.calledAt, deskModelAt))
          : lowerCursorAt;
      const upperStartAt = ticket.status === "serving"
        ? servingStartAt
        : ticket.status === "called"
          ? Math.max(upperCursorAt, calledReadyAt)
          : upperCursorAt;
      const prediction = predictFromNormalizedHistory(
        normalizedHistory,
        { ...ticket, predictionAt: expectedStartAt },
        { now: deskModelAt, timeZone, defaultServiceMs },
      );
      predictions.push(prediction);
      const startsNow = ticket.status === "serving";
      const estimatedWaitMs = startsNow ? 0 : Math.max(0, expectedStartAt - displayNow);
      const lowerWaitMs = startsNow ? 0 : Math.max(0, lowerStartAt - displayNow);
      const upperWaitMs = startsNow ? 0 : Math.max(0, upperStartAt - displayNow);
      const ticketDelayAt = !startsNow && delayAt != null ? delayAt : null;
      const minimumWaitMs = ticketDelayAt == null
        ? 0
        : Math.round(MIN_OVERRUN_WAIT_MS + workAheadAfterDelayMs);
      if ((ticket.status === "serving" || ticket.status === "called") && queueStepStartedAt == null) {
        queueStepStartedAt = ticket.status === "serving"
          ? servingStartAt
          : finiteNumber(ticket.calledAt, deskModelAt);
      }
      if (ticket.status === "queued" && queueStepEndsAt == null) {
        queueStepStartedAt ??= deskModelAt;
        queueStepEndsAt = expectedStartAt;
      }

      ticketEstimates.push({
        submissionId: String(ticket.id),
        label: ticket.label,
        serviceId: ticket.serviceId == null ? null : String(ticket.serviceId),
        deskId: deskId === "__unassigned__" ? null : deskId,
        status: ticket.status,
        ticketsAhead: startsNow ? 0 : ticketsAhead,
        estimatedWaitMs: Math.round(estimatedWaitMs),
        lowerWaitMs: Math.round(lowerWaitMs),
        upperWaitMs: Math.round(upperWaitMs),
        predictedStartAt: Math.round(expectedStartAt),
        paused: pauseStartedAt != null,
        pauseStartedAt,
        delayAt: ticketDelayAt == null ? null : Math.round(ticketDelayAt),
        minimumWaitMs,
        positionStepStartedAt: ticket.status === "queued" ? Math.round(queueStepStartedAt) : null,
        positionStepEndsAt: ticket.status === "queued" ? Math.round(queueStepEndsAt) : null,
        lowerStartAt: Math.round(lowerStartAt),
        upperStartAt: Math.round(upperStartAt),
        estimatedServiceMs: prediction.expectedMs,
        serviceRangeMs: {
          lower: prediction.lowerMs,
          upper: prediction.upperMs,
        },
        confidence: prediction.confidence,
        confidenceScore: prediction.confidenceScore,
        sampleCount: prediction.sampleCount,
        learnedFrom: prediction.sources,
      });

      expectedCursorAt = Math.max(expectedCursorAt, expectedStartAt + prediction.expectedMs);
      lowerCursorAt = Math.max(lowerCursorAt, lowerStartAt + prediction.lowerMs);
      upperCursorAt = Math.max(upperCursorAt, upperStartAt + prediction.upperMs);
      if (delayAt == null && (ticket.status === "serving" || ticket.status === "called")) {
        delayAt = expectedStartAt + prediction.expectedMs;
      } else if (delayAt != null) {
        workAheadAfterDelayMs += prediction.expectedMs;
      }
      ticketsAhead += 1;
    }

    counterEstimates.push({
      deskId: deskId === "__unassigned__" ? null : deskId,
      activeCount: orderedTickets.filter((ticket) => ticket.status !== "queued").length,
      waitingCount: orderedTickets.filter((ticket) => ticket.status === "queued").length,
      estimatedClearMs: Math.round(Math.max(0, expectedCursorAt - displayNow)),
      clearRangeMs: {
        lower: Math.round(Math.max(0, lowerCursorAt - displayNow)),
        upper: Math.round(Math.max(0, upperCursorAt - displayNow)),
      },
      predictedClearAt: Math.round(expectedCursorAt),
      paused: pauseStartedAt != null,
      pauseStartedAt,
      confidence: confidenceForQueue(predictions),
    });
  }

  const services = Array.from(
    ticketEstimates.reduce((result, estimate) => {
      const key = estimate.serviceId || "__general__";
      const current = result.get(key) || {
        serviceId: estimate.serviceId,
        waitingCount: 0,
        activeCount: 0,
        estimatedWaitTotal: 0,
        estimatedServiceTotal: 0,
        count: 0,
      };
      current.waitingCount += estimate.status === "queued" ? 1 : 0;
      current.activeCount += estimate.status === "queued" ? 0 : 1;
      current.estimatedWaitTotal += estimate.estimatedWaitMs;
      current.estimatedServiceTotal += estimate.estimatedServiceMs;
      current.count += 1;
      result.set(key, current);
      return result;
    }, new Map()).values(),
  ).map((service) => ({
    serviceId: service.serviceId,
    waitingCount: service.waitingCount,
    activeCount: service.activeCount,
    averageEstimatedWaitMs: Math.round(service.estimatedWaitTotal / service.count),
    averageServiceMs: Math.round(service.estimatedServiceTotal / service.count),
  }));

  return {
    generatedAt: now,
    model: {
      version: WAIT_MODEL_VERSION,
      historySamples: normalizedHistory.length,
      timeZone,
      learning: history.length > 0,
    },
    tickets: ticketEstimates,
    counters: counterEstimates,
    services,
  };
}
