const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const SETTINGS_STORAGE_KEY = "waitqr:settings";
const SETTINGS_CACHE_VERSION = 1;

function hasSettings(settings) {
  return settings && typeof settings === "object" && !Array.isArray(settings) && Object.keys(settings).length > 0;
}

function savedMembers(settings) {
  if (Array.isArray(settings?.members)) return settings.members;
  if (Array.isArray(settings?.staff)) return settings.staff;
  return [];
}

function savedItemCount(settings) {
  return savedMembers(settings).length + (Array.isArray(settings?.desks) ? settings.desks.length : 0) + (Array.isArray(settings?.services) ? settings.services.length : 0);
}

function chooseSettings(cachedSettings, remoteSettings) {
  if (cachedSettings?.dirty && hasSettings(cachedSettings.settings)) return cachedSettings.settings;
  const cached = cachedSettings?.settings || {};

  if (!hasSettings(cached)) return normalizeSettings(remoteSettings || {});
  if (!hasSettings(remoteSettings)) return cached;
  if (savedItemCount(remoteSettings) > savedItemCount(cached)) return normalizeSettings(remoteSettings);
  return cached;
}

function normalizeSettings(settings = {}, fallback = {}) {
  const source = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const base = fallback && typeof fallback === "object" && !Array.isArray(fallback) ? fallback : {};
  const merged = { ...base, ...source };

  if (!Array.isArray(merged.members) && Array.isArray(merged.staff)) {
    merged.members = merged.staff;
  }

  return merged;
}

function settingsForRequest(settings = {}) {
  const normalized = normalizeSettings(settings);
  if (Array.isArray(normalized.members)) {
    return { ...normalized, staff: normalized.members };
  }

  return normalized;
}

function loadCachedSettings() {
  if (typeof window === "undefined" || !window.localStorage) return { settings: {}, dirty: false };

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return { settings: {}, dirty: false };

    const parsed = JSON.parse(stored);
    if (parsed?.version === SETTINGS_CACHE_VERSION && parsed.settings) {
      return {
        settings: normalizeSettings(parsed.settings),
        dirty: Boolean(parsed.dirty),
      };
    }

    return {
      settings: normalizeSettings(parsed),
      dirty: true,
    };
  } catch (error) {
    console.warn("Failed to load cached settings.", error);
    return { settings: {}, dirty: false };
  }
}

export function cacheSettings(settings, { dirty = false } = {}) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        version: SETTINGS_CACHE_VERSION,
        dirty,
        cachedAt: Date.now(),
        settings: normalizeSettings(settings),
      })
    );
  } catch (error) {
    console.warn("Failed to cache settings locally.", error);
  }
}

export async function loadSettings() {
  const cachedSettings = loadCachedSettings();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/settings`);
  } catch (error) {
    return cachedSettings.settings;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return cachedSettings.settings;
  }

  const remoteSettings = normalizeSettings(data.settings || {});
  const settings = chooseSettings(cachedSettings, remoteSettings);
  if (hasSettings(settings)) cacheSettings(settings, { dirty: cachedSettings.dirty && settings === cachedSettings.settings });

  return settings;
}

export async function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);
  const requestSettings = settingsForRequest(normalizedSettings);
  cacheSettings(normalizedSettings, { dirty: true });
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestSettings),
    });
  } catch (error) {
    return normalizedSettings;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return normalizedSettings;
  }

  const savedSettings = normalizeSettings(data.settings || {}, normalizedSettings);
  cacheSettings(savedSettings, { dirty: false });

  return savedSettings;
}
