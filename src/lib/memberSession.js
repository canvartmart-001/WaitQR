export const MEMBER_SESSION_CHANGED_EVENT = "waitqr:member-session-changed";
const MASTER_LOGIN_KEY = "waitqr:master-login";
const ACTIVE_SESSION_KEY = "waitqr:active-session";

function readActiveSession() {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeActiveSession(session) {
  if (typeof window === "undefined") return;

  if (session) {
    window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

export function memberLoginKey(memberId) {
  return `waitqr:member-login:${memberId}`;
}

export function isMemberLoggedIn(memberId) {
  if (typeof window === "undefined" || !memberId) return false;

  const activeSession = readActiveSession();
  if (activeSession) return activeSession.type === "member" && String(activeSession.memberId) === String(memberId);

  const key = memberLoginKey(memberId);
  return window.localStorage.getItem(key) === "true" || window.sessionStorage.getItem(key) === "true";
}

export function setMemberLoggedIn(memberId, value) {
  if (typeof window === "undefined" || !memberId) return;

  const key = memberLoginKey(memberId);
  if (value) {
    writeActiveSession({ type: "member", memberId: String(memberId) });
    window.localStorage.setItem(key, "true");
    window.sessionStorage.setItem(key, "true");
  } else {
    const activeSession = readActiveSession();
    if (activeSession?.type === "member" && String(activeSession.memberId) === String(memberId)) writeActiveSession(null);
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }

  window.dispatchEvent(new CustomEvent(MEMBER_SESSION_CHANGED_EVENT));
}

export function clearAllLoginSessions(members = []) {
  if (typeof window === "undefined") return;

  (Array.isArray(members) ? members : []).forEach((member) => {
    const key = memberLoginKey(member.id);
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  });
  window.localStorage.removeItem(MASTER_LOGIN_KEY);
  window.sessionStorage.removeItem(MASTER_LOGIN_KEY);
  writeActiveSession(null);
}

export function loginAsMember(memberId, members = []) {
  clearAllLoginSessions(members);
  setMemberLoggedIn(memberId, true);
}

export function loginAsMaster(members = []) {
  clearAllLoginSessions(members);
  setMasterLoggedIn(true);
}

export function findLoggedInMember(members) {
  return (Array.isArray(members) ? members : []).find((member) => isMemberLoggedIn(member.id)) || null;
}

export function isMasterLoggedIn() {
  if (typeof window === "undefined") return false;

  const activeSession = readActiveSession();
  if (activeSession) return activeSession.type === "master";

  return window.localStorage.getItem(MASTER_LOGIN_KEY) === "true" || window.sessionStorage.getItem(MASTER_LOGIN_KEY) === "true";
}

export function setMasterLoggedIn(value) {
  if (typeof window === "undefined") return;

  if (value) {
    writeActiveSession({ type: "master" });
    window.localStorage.setItem(MASTER_LOGIN_KEY, "true");
    window.sessionStorage.setItem(MASTER_LOGIN_KEY, "true");
  } else {
    const activeSession = readActiveSession();
    if (activeSession?.type === "master") writeActiveSession(null);
    window.localStorage.removeItem(MASTER_LOGIN_KEY);
    window.sessionStorage.removeItem(MASTER_LOGIN_KEY);
  }

  window.dispatchEvent(new CustomEvent(MEMBER_SESSION_CHANGED_EVENT));
}
