import { beforeEach, expect, test } from "vitest";
import { isMasterLoggedIn, isMemberLoggedIn, loginAsMaster, loginAsMember, syncSessionStorageToActiveSession } from "./memberSession";

const members = [
  { id: "admin-1", role: "Administrator" },
  { id: "member-1", role: "Member" },
];

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

test("new member login overrides stale master session storage in another tab", () => {
  loginAsMaster(members);
  expect(isMasterLoggedIn()).toBe(true);

  window.localStorage.setItem("waitqr:active-session", JSON.stringify({ type: "member", memberId: "member-1" }));
  window.localStorage.removeItem("waitqr:master-login");
  window.localStorage.setItem("waitqr:member-login:member-1", "true");

  expect(isMasterLoggedIn()).toBe(false);
  expect(isMemberLoggedIn("admin-1")).toBe(false);
  expect(isMemberLoggedIn("member-1")).toBe(true);
});

test("new master login overrides stale member session storage in another tab", () => {
  loginAsMember("member-1", members);
  expect(isMemberLoggedIn("member-1")).toBe(true);

  window.localStorage.setItem("waitqr:active-session", JSON.stringify({ type: "master" }));
  window.localStorage.removeItem("waitqr:member-login:member-1");
  window.localStorage.setItem("waitqr:master-login", "true");

  expect(isMemberLoggedIn("member-1")).toBe(false);
  expect(isMasterLoggedIn()).toBe(true);
});

test("sync removes stale tab session storage when active session changes", () => {
  loginAsMaster(members);
  expect(window.sessionStorage.getItem("waitqr:master-login")).toBe("true");

  window.localStorage.setItem("waitqr:active-session", JSON.stringify({ type: "member", memberId: "member-1" }));
  window.localStorage.removeItem("waitqr:master-login");
  window.localStorage.setItem("waitqr:member-login:member-1", "true");

  syncSessionStorageToActiveSession(members);

  expect(window.sessionStorage.getItem("waitqr:master-login")).toBeNull();
  expect(window.sessionStorage.getItem("waitqr:member-login:admin-1")).toBeNull();
  expect(window.sessionStorage.getItem("waitqr:member-login:member-1")).toBe("true");
  expect(isMasterLoggedIn()).toBe(false);
  expect(isMemberLoggedIn("member-1")).toBe(true);
});
