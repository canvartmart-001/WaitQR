import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cacheSettings, loadSettings, saveSettings } from "./settingsApi";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("saves members with staff compatibility for older settings servers", async () => {
  const member = { id: "MEM001", name: "Asha", phone: "5551112222", password: "pass", deskIds: [1] };
  const fetchMock = vi.fn(async (_url, options) => ({
    ok: true,
    json: async () => ({
      settings: {
        desks: [{ id: 1, name: "Counter 1", services: [] }],
        staff: [member],
      },
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  const saved = await saveSettings({
    desks: [{ id: 1, name: "Counter 1", services: [] }],
    members: [member],
  });

  const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(requestBody.members).toEqual([member]);
  expect(requestBody.staff).toEqual([member]);
  expect(saved.members).toEqual([member]);
});

test("loads old staff settings as members", async () => {
  const member = { id: "MEM002", name: "Ravi", phone: "5553334444", password: "pass", deskIds: [1] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        settings: {
          desks: [{ id: 1, name: "Counter 1", services: [] }],
          staff: [member],
        },
      }),
    }))
  );

  const settings = await loadSettings();

  expect(settings.members).toEqual([member]);
});

test("keeps dirty local member deletions ahead of stale server settings", async () => {
  const staleMember = { id: "MEM003", name: "Old", phone: "5557778888", password: "pass", deskIds: [1] };
  cacheSettings({ desks: [{ id: 1, name: "Counter 1", services: [] }], members: [] }, { dirty: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        settings: {
          desks: [{ id: 1, name: "Counter 1", services: [] }],
          members: [staleMember],
        },
      }),
    }))
  );

  const settings = await loadSettings();

  expect(settings.members).toEqual([]);
});
