import { describe, expect, it } from "vitest";
import { eligibleForDesk, orderTicketsForDesk, selectNextTicketForDesk } from "./useQueue";

describe("counter queue eligibility", () => {
  const counter = { id: 2, services: ["facial"] };

  it("shows an assigned service ticket at only its selected counter", () => {
    expect(eligibleForDesk(counter)({ serviceId: "facial", deskId: 2 })).toBe(true);
    expect(eligibleForDesk({ ...counter, id: 3 })({ serviceId: "facial", deskId: 2 })).toBe(false);
  });

  it("does not duplicate an unassigned service ticket across service counters", () => {
    expect(eligibleForDesk(counter)({ serviceId: "facial", deskId: null })).toBe(false);
  });

  it("keeps unassigned general tickets eligible", () => {
    expect(eligibleForDesk(counter)({ serviceId: "", deskId: null })).toBe(true);
  });

  it("keeps older counter tickets ahead when a different service arrives", () => {
    const sharedCounter = { id: 4, services: ["hair-cut", "facial"] };
    const olderHairCut = { id: "old", type: "general", serviceId: "hair-cut", deskId: 4, createdAt: 100 };
    const newerFacial = { id: "new", type: "general", serviceId: "facial", deskId: 4, createdAt: 200 };

    expect(selectNextTicketForDesk([olderHairCut, newerFacial], sharedCounter)).toBe(olderHairCut);
    expect(orderTicketsForDesk([olderHairCut, newerFacial], sharedCounter).map((ticket) => ticket.id)).toEqual(["old", "new"]);
  });

  it("uses arrival time even when the input snapshot is not ordered", () => {
    const older = { id: "old", type: "general", serviceId: "hair-cut", deskId: 4, createdAt: 100 };
    const newer = { id: "new", type: "general", serviceId: "facial", deskId: 4, createdAt: 200 };

    expect(orderTicketsForDesk([newer, older], { id: 4, services: [] }).map((ticket) => ticket.id)).toEqual(["old", "new"]);
  });
});
