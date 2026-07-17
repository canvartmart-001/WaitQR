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
  const m = minutes(ms);
  const s = Math.floor((Math.max(0, ms) % 60000) / 1000);
  if (m >= 1) return `${m}m`;
  return `${s}s`;
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
