import { describe, expect, it } from "vitest";
import { assignedMembersForDesk, assignedMembersForService, deriveDeskServicesFromMembers, eligibleDeskIdsForService, selectDeskByLoad, selectDeskByWorkload } from "./assignments";

describe("queue counter assignment", () => {
  it("only includes counters connected through an active member and service", () => {
    const members = [
      { role: "Member", status: "Active", serviceIds: ["svc-a"], deskIds: [1, 2] },
      { role: "Member", status: "Inactive", serviceIds: ["svc-a"], deskIds: [3] },
      { role: "Member", status: "Active", serviceIds: ["svc-b"], deskIds: [4] },
    ];

    expect(eligibleDeskIdsForService(members, "svc-a", [1, 2, 3, 4])).toEqual([1, 2]);
  });

  it("chooses the least-loaded counter using the selected service's loads", () => {
    // Loads from other services are intentionally not part of this map. Counter
    // 2 wins even if it has more unrelated work in its other service queues.
    expect(selectDeskByLoad([1, 2, 3], { 1: 4, 2: 1, 3: 3 }, 1)).toBe(2);
  });

  it("round-robins counters tied at the lowest load", () => {
    expect(selectDeskByLoad([1, 2, 3], { 1: 2, 2: 2, 3: 2 }, 1)).toBe(2);
    expect(selectDeskByLoad([1, 2, 3], { 1: 2, 2: 2, 3: 2 }, 3)).toBe(1);
  });

  it("avoids a counter busy with other services", () => {
    const serviceLoads = { 2: 0, 4: 1 };
    const totalLoads = { 2: 5, 4: 2 };

    expect(selectDeskByWorkload([2, 4], serviceLoads, totalLoads, 2)).toBe(4);
  });

  it("uses selected-service load and round robin when total workload ties", () => {
    expect(selectDeskByWorkload([2, 4], { 2: 2, 4: 1 }, { 2: 3, 4: 3 }, 2)).toBe(4);
    expect(selectDeskByWorkload([2, 4], { 2: 1, 4: 1 }, { 2: 3, 4: 3 }, 2)).toBe(4);
  });

  it("keeps stored assignments dormant when the role is incompatible", () => {
    const administrator = { id: "m1", role: "Administrator", serviceIds: ["svc-a"], deskIds: [2] };

    expect(assignedMembersForService([administrator], "svc-a")).toEqual([]);
    expect(assignedMembersForDesk([administrator], 2)).toEqual([]);
    expect(eligibleDeskIdsForService([administrator], "svc-a", [2])).toEqual([]);
    expect(deriveDeskServicesFromMembers([{ id: 2, services: [] }], [administrator], [{ id: "svc-a" }], { preserveWithoutMembers: false })[0].services).toEqual([]);

    const restoredMember = { ...administrator, role: "Member" };
    expect(assignedMembersForService([restoredMember], "svc-a")).toEqual([restoredMember]);
    expect(assignedMembersForDesk([restoredMember], 2)).toEqual([restoredMember]);
    expect(eligibleDeskIdsForService([restoredMember], "svc-a", [2])).toEqual([2]);
  });
});
