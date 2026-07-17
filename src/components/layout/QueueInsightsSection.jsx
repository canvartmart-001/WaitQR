import { useMemo, useState } from "react";
import { Activity, PieChart } from "lucide-react";
import { C } from "../../lib/theme";

const DETAIL_SERIES = [
  { key: "waiting", label: "Waiting", color: C.amber },
  { key: "serving", label: "Serving", color: C.teal },
  { key: "absent", label: "Absent", color: C.coral },
];

const PLOT_SERIES = [
  { key: "waiting", label: "Waiting", color: C.amber },
  { key: "serving", label: "Serving", color: C.teal },
];
const TIME_WINDOWS = [
  { key: "24h", label: "24h", durationMs: 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000, axisLabelKey: "hour", tooltipLabelKey: "minute" },
  { key: "1h", label: "1h", durationMs: 60 * 60 * 1000, bucketMs: 60 * 1000, axisLabelKey: "minute", tooltipLabelKey: "minute" },
  { key: "30m", label: "30m", durationMs: 30 * 60 * 1000, bucketMs: 60 * 1000, axisLabelKey: "minute", tooltipLabelKey: "minute" },
  { key: "10m", label: "10m", durationMs: 10 * 60 * 1000, bucketMs: 10 * 1000, axisLabelKey: "minutesAgo", tooltipLabelKey: "second" },
  { key: "5m", label: "5m", durationMs: 5 * 60 * 1000, bucketMs: 1000, axisLabelKey: "minutesAgo", tooltipLabelKey: "second" },
  { key: "1m", label: "1m", durationMs: 60 * 1000, bucketMs: 1000, axisLabelKey: "secondsAgo", tooltipLabelKey: "second" },
];
const DEFAULT_TIME_WINDOW_KEY = "24h";
const X_TICK_COUNT = 6;

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function formatRangeLabel(timestamp, rangeKey, rangeEnd) {
  if (Math.abs(rangeEnd - timestamp) < 1) return "now";

  if (rangeKey === "minutesAgo") {
    const minutesAgo = Math.max(0, Math.round((rangeEnd - timestamp) / (60 * 1000)));
    return minutesAgo === 0 ? "now" : `${minutesAgo}m`;
  }
  if (rangeKey === "secondsAgo") {
    const secondsAgo = Math.max(0, Math.round((rangeEnd - timestamp) / 1000));
    return secondsAgo === 0 ? "now" : `${secondsAgo}s`;
  }
  if (rangeKey === "second") return new Date(timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });
  if (rangeKey === "minute") return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTooltipLabel(timestamp, rangeKey) {
  if (rangeKey === "second") {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  if (rangeKey === "minute") {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (rangeKey === "hour") {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function startOfBucket(timestamp, bucketMs) {
  return Math.floor(timestamp / bucketMs) * bucketMs;
}

function addBucketStep(timestamp, steps = 1, bucketMs) {
  return timestamp + bucketMs * steps;
}

function createWindowRange(currentTime, window) {
  const rangeEnd = addBucketStep(startOfBucket(currentTime, window.bucketMs), 1, window.bucketMs);
  const rangeStart = rangeEnd - window.durationMs;

  return { rangeStart, rangeEnd };
}

function createBucketBoundaries(rangeStart, rangeEnd, bucketMs) {
  const boundaries = [];
  let cursor = startOfBucket(rangeStart, bucketMs);

  while (cursor <= rangeEnd) {
    boundaries.push(cursor);
    cursor = addBucketStep(cursor, 1, bucketMs);
  }

  if (boundaries.length === 0 || boundaries[boundaries.length - 1] !== rangeEnd) {
    boundaries.push(rangeEnd);
  }

  return boundaries;
}

function createYAxisScale(maxValue) {
  const paddedMax = Math.max(1, maxValue * 1.12);
  const targetTickCount = 4;
  const rawStep = paddedMax / targetTickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const niceStep =
    normalizedStep <= 1
      ? 1
      : normalizedStep <= 2
        ? 2
        : normalizedStep <= 2.5
          ? 2.5
          : normalizedStep <= 5
            ? 5
            : 10;
  // Queue counts are discrete, so keep the chart scale on whole-number steps.
  const step = Math.max(1, Math.ceil(niceStep * magnitude));
  const chartMaxValue = Math.max(step, Math.ceil(paddedMax / step) * step);
  const tickCount = Math.round(chartMaxValue / step);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => Number((index * step).toFixed(8)));

  return { chartMaxValue, yTicks };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createSmoothPath(coords) {
  if (coords.length === 0) return "";
  if (coords.length === 1) {
    const point = coords[0];
    return `M ${point.x - 14} ${point.y} L ${point.x + 14} ${point.y}`;
  }

  return coords.slice(1).reduce((path, point, index) => {
    const previous = coords[index];
    const midX = previous.x + (point.x - previous.x) / 2;

    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${coords[0].x} ${coords[0].y}`);
}

function createSmoothAreaPath(coords, baselineY) {
  if (coords.length === 0) return "";

  const linePath = createSmoothPath(coords);
  const first = coords[0];
  const last = coords[coords.length - 1];

  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function cubicPointAt(t, start, controlA, controlB, end) {
  const inverse = 1 - t;
  const inverseSquared = inverse * inverse;
  const tSquared = t * t;

  return {
    x: inverseSquared * inverse * start.x + 3 * inverseSquared * t * controlA.x + 3 * inverse * tSquared * controlB.x + tSquared * t * end.x,
    y: inverseSquared * inverse * start.y + 3 * inverseSquared * t * controlA.y + 3 * inverse * tSquared * controlB.y + tSquared * t * end.y,
  };
}

function pointOnSmoothPathAtX(coords, x) {
  if (coords.length === 0) return null;
  if (coords.length === 1) return { ...coords[0], x };

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (x <= first.x) return { ...first, x: first.x };
  if (x >= last.x) return { ...last, x: last.x };

  const segmentIndex = coords.findIndex((point, index) => index > 0 && x <= point.x);
  const end = coords[Math.max(1, segmentIndex)];
  const start = coords[Math.max(0, segmentIndex - 1)];
  const midX = start.x + (end.x - start.x) / 2;
  const controlA = { x: midX, y: start.y };
  const controlB = { x: midX, y: end.y };
  let low = 0;
  let high = 1;

  for (let index = 0; index < 16; index += 1) {
    const t = (low + high) / 2;
    const point = cubicPointAt(t, start, controlA, controlB, end);
    if (point.x < x) low = t;
    else high = t;
  }

  return cubicPointAt((low + high) / 2, start, controlA, controlB, end);
}

function normalizeLiveQueuePoints(points, fallbackCounts, now) {
  const normalized = points
    .map((point) => ({
      time: Number(point.time),
      waiting: Math.max(0, Number(point.waiting || 0)),
      serving: Math.max(0, Number(point.serving || 0)),
      absent: Math.max(0, Number(point.absent || 0)),
      eventType: point.eventType || "snapshot",
    }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);

  if (normalized.length > 0) return normalized;

  return [
    {
      time: Number.isFinite(now) ? now : Date.now(),
      ...fallbackCounts,
      total: fallbackCounts.waiting + fallbackCounts.serving,
      eventType: "snapshot",
    },
  ];
}

function getServingStartTime(submission) {
  const startedAt = Number(submission.startedAt);
  if (Number.isFinite(startedAt)) return startedAt;
  if (submission.status === "serving") {
    const statusUpdatedAt = Number(submission.statusUpdatedAt);
    if (Number.isFinite(statusUpdatedAt)) return statusUpdatedAt;
  }
  return null;
}

function getExitTime(submission) {
  if (submission.status === "completed" || submission.status === "skipped" || submission.status === "removed") {
    const statusUpdatedAt = Number(submission.statusUpdatedAt);
    return Number.isFinite(statusUpdatedAt) ? statusUpdatedAt : null;
  }
  return null;
}

function createTicketLifecycleEvents(submissions) {
  return submissions
    .flatMap((submission) => {
      const createdAt = Number(submission.createdAt);
      if (!Number.isFinite(createdAt)) return [];

      const events = [
        {
          time: createdAt,
          waitingDelta: 1,
          servingDelta: 0,
          absentDelta: 0,
          eventType: "joined",
          ticketLabel: submission.label,
          order: 1,
        },
      ];
      const servingStart = getServingStartTime(submission);
      const exitTime = getExitTime(submission);

      const isAbsentExit = submission.status === "skipped" || submission.status === "removed";

      if (!isAbsentExit && servingStart != null && servingStart >= createdAt && (exitTime == null || servingStart <= exitTime)) {
        events.push({
          time: servingStart,
          waitingDelta: -1,
          servingDelta: 1,
          absentDelta: 0,
          eventType: "serving-started",
          ticketLabel: submission.label,
          order: 2,
        });
      }

      if (exitTime != null && exitTime >= createdAt) {
        const exitsServing = !isAbsentExit && servingStart != null && servingStart <= exitTime;
        events.push({
          time: exitTime,
          waitingDelta: exitsServing ? 0 : -1,
          servingDelta: exitsServing ? -1 : 0,
          absentDelta: isAbsentExit ? 1 : 0,
          eventType: submission.status,
          ticketLabel: submission.label,
          order: 3,
        });
      }

      return events;
    })
    .sort((a, b) => a.time - b.time || a.order - b.order);
}

function createLifecycleHistoryPoints(submissions, fallbackCounts, now, rangeStart) {
  const currentTime = Number.isFinite(now) ? now : Date.now();
  const events = createTicketLifecycleEvents(submissions).filter((event) => event.time <= currentTime);

  if (events.length === 0) {
    return [
      {
        time: rangeStart,
        waiting: fallbackCounts.waiting,
        serving: fallbackCounts.serving,
        absent: fallbackCounts.absent,
        eventType: "snapshot",
        baseline: true,
      },
      {
        time: currentTime,
        waiting: fallbackCounts.waiting,
        serving: fallbackCounts.serving,
        absent: fallbackCounts.absent,
        eventType: "snapshot",
        hold: true,
      },
    ];
  }

  let waiting = 0;
  let serving = 0;
  let absent = 0;
  const points = [{ time: rangeStart, waiting: 0, serving: 0, absent: 0, eventType: "baseline", baseline: true }];

  events.forEach((event) => {
    waiting = Math.max(0, waiting + event.waitingDelta);
    serving = Math.max(0, serving + event.servingDelta);
    absent = Math.max(0, absent + event.absentDelta);

    if (event.time >= rangeStart) {
      points.push({
        time: event.time,
        waiting,
        serving,
        absent,
        eventType: event.eventType,
        ticketLabel: event.ticketLabel,
      });
    } else {
      points[0] = { ...points[0], waiting, serving, absent };
    }
  });

  const lastPoint = points[points.length - 1];
  if (lastPoint.time < currentTime) {
    points.push({
      ...lastPoint,
      time: currentTime,
      hold: true,
    });
  }

  return points;
}

function buildStateHistoryPoints(events, fallbackCounts, now, rangeStart) {
  const currentTime = Number.isFinite(now) ? now : Date.now();
  const normalizedEvents = normalizeLiveQueuePoints(events, fallbackCounts, currentTime);
  const previousEvent = [...normalizedEvents].reverse().find((event) => event.time <= rangeStart);
  const visibleEvents = normalizedEvents.filter((event) => event.time > rangeStart && event.time <= currentTime);
  const firstVisibleEvent = visibleEvents[0] || normalizedEvents.find((event) => event.time >= rangeStart);
  const baseline = {
    time: rangeStart,
    waiting: previousEvent ? previousEvent.waiting : firstVisibleEvent ? firstVisibleEvent.waiting : fallbackCounts.waiting,
    serving: previousEvent ? previousEvent.serving : firstVisibleEvent ? firstVisibleEvent.serving : fallbackCounts.serving,
    absent: previousEvent ? previousEvent.absent : firstVisibleEvent ? firstVisibleEvent.absent : fallbackCounts.absent,
    eventType: "baseline",
    baseline: true,
  };
  const lastEvent = visibleEvents[visibleEvents.length - 1] || previousEvent || baseline;
  const holdPoint = currentTime > lastEvent.time
    ? {
        ...lastEvent,
        time: currentTime,
        hold: true,
      }
    : null;

  return holdPoint ? [baseline, ...visibleEvents, holdPoint] : [baseline, ...visibleEvents];
}

function sampleHistoryPoints(points, rangeStart, rangeEnd, bucketMs) {
  if (!Array.isArray(points) || points.length === 0 || !Number.isFinite(bucketMs)) return points;

  return createBucketBoundaries(rangeStart, rangeEnd, bucketMs).map((time) => ({
    ...stateAtTime(points, time),
    time,
    sampled: true,
  }));
}

function createRelativeTickTimes(rangeStart, rangeEnd, stepMs) {
  const ticks = [];
  let cursor = rangeStart;

  while (cursor < rangeEnd) {
    ticks.push(cursor);
    cursor += stepMs;
  }

  ticks.push(rangeEnd);
  return ticks;
}

function createChartTickTimes(boundaries, axisLabelKey, rangeEnd, rangeStart) {
  if (axisLabelKey === "minutesAgo") {
    return createRelativeTickTimes(rangeStart, rangeEnd, 60 * 1000);
  }

  if (axisLabelKey === "secondsAgo") {
    return createRelativeTickTimes(rangeStart, rangeEnd, 10 * 1000);
  }

  const tickStep = Math.max(1, Math.ceil(boundaries.length / X_TICK_COUNT));
  const tickTimes = boundaries.filter((_, index) => index === 0 || index === boundaries.length - 1 || index % tickStep === 0);
  const uniqueTickTimes = [...new Set(tickTimes)];
  const lastTick = uniqueTickTimes[uniqueTickTimes.length - 1];
  const previousTick = uniqueTickTimes[uniqueTickTimes.length - 2];

  if (previousTick == null) return uniqueTickTimes;

  const labelsMatch = formatRangeLabel(previousTick, axisLabelKey, rangeEnd) === formatRangeLabel(lastTick, axisLabelKey, rangeEnd);

  return labelsMatch
    ? [...uniqueTickTimes.slice(0, -2), lastTick]
    : uniqueTickTimes;
}

function addTradingMovement(points) {
  return points.map((point, index) => {
    const previous = index > 0 ? points[index - 1] : null;
    const total = point.waiting + point.serving;
    const previousTotal = previous ? previous.waiting + previous.serving : total;
    const waitingDelta = point.waiting - (previous ? previous.waiting : point.waiting);
    const servingDelta = point.serving - (previous ? previous.serving : point.serving);
    const absentDelta = point.absent - (previous ? previous.absent : point.absent);
    const totalDelta = total - previousTotal;

    return {
      ...point,
      total,
      deltas: {
        total: totalDelta,
        waiting: waitingDelta,
        serving: servingDelta,
        absent: absentDelta,
      },
      directions: {
        total: totalDelta > 0 ? "up" : totalDelta < 0 ? "down" : "flat",
        waiting: waitingDelta > 0 ? "up" : waitingDelta < 0 ? "down" : "flat",
        serving: servingDelta > 0 ? "up" : servingDelta < 0 ? "down" : "flat",
        absent: absentDelta > 0 ? "up" : absentDelta < 0 ? "down" : "flat",
      },
    };
  });
}

function stateAtTime(points, time) {
  const firstPoint = points[0] || { total: 0, waiting: 0, serving: 0, absent: 0, deltas: { total: 0, waiting: 0, serving: 0, absent: 0 } };
  return points.reduce((state, point) => (point.time <= time ? point : state), firstPoint);
}

export function QueueInsightsSection({ waitingNow, servingNow, servedToday, absentNow, submissions = [], liveQueuePoints = [], now, theme }) {
  const palette = theme || {
    accentColor: C.amber,
    bgColor: C.ink900,
    fontColor: C.textLight,
    borderColor: C.hair,
    radius: 16,
  };
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const [hoveredTime, setHoveredTime] = useState(null);
  const [selectedTimeWindowKey, setSelectedTimeWindowKey] = useState(DEFAULT_TIME_WINDOW_KEY);
  const selectedTimeWindow = TIME_WINDOWS.find((window) => window.key === selectedTimeWindowKey) || TIME_WINDOWS[0];
  const statusItems = useMemo(() => {
    const items = [
      { key: "served", label: "Served", value: servedToday, color: "#7C8497" },
      { key: "serving", label: "Serving", value: servingNow, color: C.teal },
      { key: "waiting", label: "Waiting", value: waitingNow, color: C.amber },
      { key: "absent", label: "Absent", value: absentNow, color: C.coral },
    ];
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return { items, total };
  }, [absentNow, servedToday, servingNow, waitingNow]);

  const donutSegments = useMemo(() => {
    const { items, total } = statusItems;
    if (total === 0) return [];

    let cursor = 0;
    return items
      .filter((item) => item.value > 0)
      .map((item) => {
        const sweep = (item.value / total) * 360;
        const segment = {
          ...item,
          startAngle: cursor,
          endAngle: cursor + sweep,
          percentage: Math.round((item.value / total) * 100),
        };
        cursor += sweep;
        return segment;
      });
  }, [statusItems]);

  const chartState = useMemo(() => {
    const currentTime = Number.isFinite(now) ? now : Date.now();
    const hasSubmissionHistory = submissions.some((submission) => Number.isFinite(Number(submission.createdAt)));
    const { rangeStart, rangeEnd } = createWindowRange(currentTime, selectedTimeWindow);
    const fallbackCounts = { waiting: waitingNow, serving: servingNow, served: servedToday, absent: absentNow };
    const historyPoints = hasSubmissionHistory
      ? createLifecycleHistoryPoints(submissions, fallbackCounts, currentTime, rangeStart)
      : buildStateHistoryPoints(liveQueuePoints, fallbackCounts, currentTime, rangeStart);
    const sampledHistoryPoints = sampleHistoryPoints(historyPoints, rangeStart, rangeEnd, selectedTimeWindow.bucketMs);
    const points = addTradingMovement(sampledHistoryPoints);
    const allValues = points.flatMap((point) => PLOT_SERIES.map((series) => point[series.key]));
    const maxValue = Math.max(1, ...allValues);
    const { chartMaxValue, yTicks } = createYAxisScale(maxValue);
    const width = 720;
    const height = 320;
    const left = 34;
    const right = 14;
    const top = 20;
    const bottom = 42;
    const innerHeight = height - top - bottom;
    const zeroLineLift = 2;
    const liveMarkerInset = 24;
    const frameRight = width - right;
    const plotRight = frameRight - liveMarkerInset;
    const innerWidth = plotRight - left;
    const timeSpan = Math.max(1, rangeEnd - rangeStart);

    const projectX = (time) => left + ((time - rangeStart) / timeSpan) * innerWidth;
    const projectY = (value) => top + innerHeight - zeroLineLift - (value / chartMaxValue) * (innerHeight - zeroLineLift);
    const pointXs = points.map((point) => projectX(point.time));
    const plotSeries = PLOT_SERIES.reduce((next, item) => {
      const coords = points.map((point, index) => ({
        x: pointXs[index],
        y: projectY(point[item.key]),
        value: point[item.key],
        time: point.time,
        delta: point.deltas[item.key],
        direction: point.directions[item.key],
      }));
      const path = createSmoothPath(coords);
      const areaPath = createSmoothAreaPath(coords, top + innerHeight);
      next[item.key] = {
        ...item,
        coords,
        path,
        areaPath,
      };
      return next;
    }, {});
    const bucketBoundaries = createBucketBoundaries(rangeStart, rangeEnd, selectedTimeWindow.bucketMs);
    const xTicks = createChartTickTimes(bucketBoundaries, selectedTimeWindow.axisLabelKey, rangeEnd, rangeStart).map((time) => ({ time, x: projectX(time) }));

    return {
      width,
      height,
      top,
      bottom,
      left,
      right,
      frameRight,
      plotRight,
      innerHeight,
      rangeStart,
      rangeEnd,
      chartMaxValue,
      zeroLineLift,
      liveMarkerInset,
      yTicks,
      points,
      projectX,
      projectY,
      plotSeries,
      xTicks,
      axisLabelKey: selectedTimeWindow.axisLabelKey,
      tooltipLabelKey: selectedTimeWindow.tooltipLabelKey,
    };
  }, [absentNow, liveQueuePoints, now, selectedTimeWindow, servedToday, servingNow, submissions, waitingNow]);

  const activePoint = hoveredTime == null ? null : stateAtTime(chartState.points, hoveredTime);
  const activeX = hoveredTime == null ? null : chartState.projectX(hoveredTime);
  const activePlotPoints = activeX == null
    ? []
    : PLOT_SERIES.map((series) => {
        if (!activePoint) return null;
        const curvePoint = pointOnSmoothPathAtX(chartState.plotSeries[series.key].coords, activeX);
        if (!curvePoint) return null;

        return {
          x: curvePoint.x,
          y: curvePoint.y,
          value: activePoint[series.key],
        };
      }).filter(Boolean);
  const chartBottom = chartState.top + chartState.innerHeight;
  const updateHoveredPointIndex = (clientX, currentTarget) => {
    const bounds = currentTarget.getBoundingClientRect();
    const pointerRatio = bounds.width > 0 ? (clientX - bounds.left) / bounds.width : 0;
    const pointerX = clampNumber(pointerRatio * chartState.width, chartState.left, chartState.plotRight);
    const plotWidth = chartState.plotRight - chartState.left;
    const nextTime = chartState.rangeStart + ((pointerX - chartState.left) / plotWidth) * (chartState.rangeEnd - chartState.rangeStart);

    setHoveredTime(clampNumber(nextTime, chartState.rangeStart, chartState.rangeEnd));
  };
  const handleChartPointerMove = (event) => {
    updateHoveredPointIndex(event.clientX, event.currentTarget);
  };
  const handleChartTouchMove = (event) => {
    if (!event.touches[0]) return;
    updateHoveredPointIndex(event.touches[0].clientX, event.currentTarget);
  };

  return (
    <div className="px-2.5 pb-2.5 sm:px-6 sm:pb-6 md:pl-10 md:pr-6">
      <section className="grid gap-5 border bg-white/5 p-4 lg:grid-cols-[minmax(240px,0.58fr)_1px_minmax(0,1.42fr)]" style={{ borderColor: palette.borderColor, borderRadius: palette.radius * 1.4 }}>
        <div className="min-w-0 flex flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]" style={{ color: withAlpha(palette.fontColor, "80") }}>
              <PieChart size={13} />
              Ticket status
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 lg:gap-3">
            <div className="relative flex h-[236px] w-[236px] items-center justify-center">
              <svg viewBox="0 0 236 236" className="h-full w-full">
                <circle cx="118" cy="118" r="80" fill="none" stroke={withAlpha(palette.borderColor, "80")} strokeWidth="24" />
                {donutSegments.map((segment) => (
                  <path
                    key={segment.key}
                    d={describeArc(118, 118, 80, segment.startAngle, segment.endAngle)}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="24"
                    strokeLinecap="butt"
                    opacity={hoveredStatus ? (hoveredStatus === segment.key ? 1 : 0.22) : segment.key === "waiting" ? 1 : 0.92}
                    style={{ transition: "opacity 180ms ease" }}
                  />
                ))}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="qp-mono text-5xl font-semibold leading-none" style={{ color: palette.fontColor }}>
                  {waitingNow}
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.26em]" style={{ color: withAlpha(palette.fontColor, "70") }}>
                  Waiting
                </div>
              </div>
            </div>

            <div className="grid w-full gap-0.5">
              {statusItems.items.map((item) => {
                const percentage = statusItems.total > 0 ? Math.round((item.value / statusItems.total) * 100) : 0;
                return (
                  <div
                    key={item.key}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
                    style={{
                      background:
                        hoveredStatus === item.key
                          ? withAlpha(palette.fontColor, "12")
                          : "transparent",
                    }}
                    onMouseEnter={() => setHoveredStatus(item.key)}
                    onMouseLeave={() => setHoveredStatus(null)}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: item.color }} />
                    <span className="min-w-0 truncate text-sm font-medium" style={{ color: palette.fontColor }}>
                      {item.label}
                    </span>
                    <span className="qp-mono text-sm" style={{ color: withAlpha(palette.fontColor, "70") }}>
                      {percentage}%
                    </span>
                    <span className="qp-mono text-xl font-semibold" style={{ color: item.color }}>
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden w-px lg:block" style={{ background: palette.borderColor }} />

        <div className="min-w-0 border-t pt-5 lg:border-t-0 lg:pt-0 flex flex-col" style={{ borderColor: palette.borderColor }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em]" style={{ color: withAlpha(palette.fontColor, "80") }}>
              <Activity size={13} />
              Live queue state
            </div>
          </div>

          <div className="relative min-w-0 h-[200px] flex-1 sm:h-[280px] lg:h-[360px]">
            <svg
              viewBox={`0 0 ${chartState.width} ${chartState.height}`}
              className="h-full w-full"
              onMouseMove={handleChartPointerMove}
              onTouchStart={handleChartTouchMove}
              onTouchMove={handleChartTouchMove}
              style={{ touchAction: "none" }}
              onMouseLeave={() => setHoveredTime(null)}
              onTouchEnd={() => setHoveredTime(null)}
              onTouchCancel={() => setHoveredTime(null)}
            >
              <defs>
                <clipPath id="qp-chart-plot-clip">
                  <rect
                    x={chartState.left}
                    y={chartState.top}
                    width={chartState.frameRight - chartState.left}
                    height={chartState.innerHeight}
                  />
                </clipPath>
                {PLOT_SERIES.map((series) => (
                  <linearGradient key={series.key} id={`qp-chart-area-${series.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={series.color} stopOpacity="0.22" />
                    <stop offset="72%" stopColor={series.color} stopOpacity="0.07" />
                    <stop offset="100%" stopColor={series.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>

              {chartState.yTicks.map((value) => {
                const y = chartState.top + chartState.innerHeight - (value / chartState.chartMaxValue) * chartState.innerHeight;
                return (
                  <g key={value}>
                    <text className="qp-chart-axis-text" x={chartState.left - 14} y={y + 3} textAnchor="end" fill={withAlpha(palette.fontColor, "70")}>
                      {value}
                    </text>
                    <line
                      className="qp-chart-y-grid-line"
                      x1={chartState.left}
                      x2={chartState.frameRight}
                      y1={y}
                      y2={y}
                      stroke={value === 0 ? withAlpha(palette.borderColor, "99") : withAlpha(palette.borderColor, "66")}
                      strokeDasharray={value === 0 ? "none" : "4 8"}
                    />
                  </g>
                );
              })}

              {chartState.xTicks.map((tick, index) => {
                return (
                  <text className="qp-chart-axis-text" key={`x-label-${tick.time}-${index}`} x={tick.x} y={chartState.height - 10} textAnchor="middle" fill={withAlpha(palette.fontColor, "70")}>
                    {formatRangeLabel(tick.time, chartState.axisLabelKey, chartState.rangeEnd)}
                  </text>
                );
              })}

              {chartState.xTicks.map((tick, index) => {
                return (
                  <line
                    className="qp-chart-x-grid-line"
                    key={`x-grid-${tick.time}-${index}`}
                    x1={tick.x}
                    x2={tick.x}
                    y1={chartState.top}
                    y2={chartBottom}
                    stroke={withAlpha(palette.borderColor, "55")}
                    strokeDasharray="4 8"
                  />
                );
              })}

              {activeX != null ? (
                <>
                  <rect
                    x={activeX - 18}
                    y={chartState.top}
                    width="36"
                    height={chartState.innerHeight}
                    rx="12"
                    fill={withAlpha(palette.fontColor, "10")}
                  />
                  <line
                    x1={activeX}
                    x2={activeX}
                    y1={chartState.top}
                    y2={chartBottom}
                    stroke={withAlpha(palette.fontColor, "2e")}
                    strokeDasharray="3 7"
                  />
                </>
              ) : null}

              <g clipPath="url(#qp-chart-plot-clip)">
                {PLOT_SERIES.map((series, seriesIndex) => {
                  const plottedSeries = chartState.plotSeries[series.key];
                  const latestSeriesPoint = plottedSeries.coords[plottedSeries.coords.length - 1];
                  const activeSeriesPoint = activePlotPoints[seriesIndex] || null;

                  return (
                    <g key={series.key}>
                      <path
                        className="qp-chart-series-area"
                        d={plottedSeries.areaPath}
                        fill={`url(#qp-chart-area-${series.key})`}
                        style={{ transition: "d 220ms ease" }}
                      />
                      <path
                        className="qp-chart-series-line"
                        d={plottedSeries.path}
                        fill="none"
                        stroke={series.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ transition: "d 220ms ease" }}
                      />
                      {activeSeriesPoint && activeSeriesPoint !== latestSeriesPoint ? (
                        <circle
                          cx={activeX}
                          cy={activeSeriesPoint.y}
                          r="4"
                          fill={series.color}
                          stroke={palette.bgColor}
                          strokeWidth="2"
                        />
                      ) : null}
                      {latestSeriesPoint ? (
                        <g className="qp-chart-live-point">
                          <circle
                            className="qp-chart-live-halo"
                            cx={latestSeriesPoint.x}
                            cy={latestSeriesPoint.y}
                            fill={series.color}
                            opacity="0.14"
                            style={{ "--qp-live-color": series.color }}
                          />
                          <circle
                            className="qp-chart-live-dot"
                            cx={latestSeriesPoint.x}
                            cy={latestSeriesPoint.y}
                            fill={series.color}
                            stroke={palette.bgColor}
                            strokeWidth="2"
                          />
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>

            {activePoint && activePlotPoints.length > 0 ? (
              <div
                className="pointer-events-none absolute rounded-[14px] border px-3 py-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
                style={{
                  left: `clamp(12px, calc(${((activePlotPoints[0].x / chartState.width) * 100).toFixed(2)}% - 72px), calc(100% - 152px))`,
                  top: `clamp(10px, calc(${((Math.min(...activePlotPoints.map((point) => point.y)) / chartState.height) * 100).toFixed(2)}% - 108px), calc(100% - 140px))`,
                  width: 140,
                  background: withAlpha(palette.bgColor, "e6"),
                  borderColor: withAlpha(palette.borderColor, "cc"),
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="grid gap-1 text-[13px]">
                  <div className="qp-mono text-[12px] font-semibold" style={{ color: palette.fontColor }}>
                    {formatTooltipLabel(activePoint.time, chartState.tooltipLabelKey)}
                  </div>
                  {DETAIL_SERIES.map((series) => (
                    <div key={series.key} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2" style={{ color: withAlpha(palette.fontColor, "80") }}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: series.color }} />
                        {series.label}
                      </div>
                      <span className="qp-mono font-semibold" style={{ color: palette.fontColor }}>
                        {activePoint[series.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-start gap-2">
            <label className="sr-only" htmlFor="queue-window-select">
              Queue graph window
            </label>
              <select
                id="queue-window-select"
                value={selectedTimeWindowKey}
                onChange={(event) => {
                  setSelectedTimeWindowKey(event.target.value);
                  setHoveredTime(null);
                }}
                className="rounded-md border px-2.5 py-1.5 text-xs font-semibold outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: palette.borderColor,
                  color: palette.fontColor,
                  boxShadow: "none",
                }}
              >
                {TIME_WINDOWS.map((window) => (
                  <option key={window.key} value={window.key} style={{ background: palette.bgColor, color: palette.fontColor }}>
                    {window.label}
                  </option>
                ))}
              </select>
          </div>

        </div>
      </section>
    </div>
  );
}
