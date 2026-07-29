// Pure formatting/text helpers — no React, no state. Safe to unit test in isolation and safe to
// reuse server-side later (e.g. formatting ticket labels the same way in a Node API).

export function pad(n) {
  return String(n).padStart(3, "0");
}

export function minutes(ms) {
  return Math.max(0, Math.floor(ms / 60000));
}

export function pluralize(word) {
  if (!word) return word;
  if (/[sxz]$|[sc]h$/i.test(word)) return word + "es";
  if (/[^aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
  return word + "s";
}

export function elapsedLabel(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutesPart = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours >= 1) return minutesPart > 0 ? `${hours}h ${minutesPart}m` : `${hours}h`;
  if (minutesPart >= 1) return `${minutesPart}m`;
  return `${seconds}s`;
}

export function elapsedTimerLabel(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutesPart = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days >= 1) {
    return `${days}d ${String(hours).padStart(2, "0")}:${String(minutesPart).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  if (hours >= 1) {
    return `${hours}:${String(minutesPart).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutesPart}:${String(seconds).padStart(2, "0")}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function clockLabel(date) {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutesPart = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours24 >= 12 ? "PM" : "AM";
  return `${hours12}.${minutesPart} ${suffix}`;
}

export function finishTimeLabel(timestamp, nowTimestamp = Date.now()) {
  const time = Number(timestamp);
  if (!Number.isFinite(time)) return "";

  const date = new Date(time);
  const now = new Date(nowTimestamp);
  const dayDiff = Math.floor((startOfDay(now) - startOfDay(date)) / 86400000);
  const timeText = clockLabel(date);

  if (dayDiff === 0) return `Today, ${timeText}`;
  if (dayDiff > 0 && dayDiff < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })}, ${timeText}`;
  }

  return `${date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}, ${timeText}`;
}
