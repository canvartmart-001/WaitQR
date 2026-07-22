const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export async function createSubmission(payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(data.error || "No counter is currently assigned to this service.");
    }
    if (response.status >= 500) {
      throw new Error(data.error || "Backend could not save the submission. Check DATABASE_URL and that PostgreSQL is running.");
    }

    throw new Error(data.error || "Failed to save submission.");
  }

  return data;
}

export async function listSubmissions(limit = 500) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions?limit=${limit}`);
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to load saved submissions.");
  }

  return data.submissions || [];
}

export async function getSubmissionByLabel(label) {
  if (!label) return null;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions/label/${encodeURIComponent(label)}`);
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(data.error || "Failed to load submission.");
  }

  return data.submission || null;
}

export async function getSubmissionStats() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions/stats`);
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to load submission stats.");
  }

  return data.stats || { total: 0, general: 0, priority: 0 };
}

export async function listQueueCountEvents(limit = 500) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/queue-count-events?limit=${limit}`);
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to load queue count history.");
  }

  return data.events || [];
}

export async function clearSubmissions() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions`, {
      method: "DELETE",
    });
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to clear saved submissions.");
  }

  return data;
}

export async function updateSubmissionStatus(id, status, options = {}) {
  if (!id) return null;
  const { deskId = null } = options;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/submissions/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, deskId }),
    });
  } catch (error) {
    throw new Error("Submission service is unavailable. Start the backend and confirm the API is reachable.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Failed to update submission status.");
  }

  return data.submission;
}
