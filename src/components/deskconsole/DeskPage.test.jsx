import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeskPage } from "./DeskPage";

describe("counter recall request cards", () => {
  it("keeps multiple requests visible when another ticket is already called", () => {
    const recallAbsent = vi.fn();
    const desk = {
      id: "1",
      name: "Counter 1",
      current: {
        id: "called-1",
        label: "A001",
        name: "Called customer",
        serviceId: "massage",
        createdAt: 1_000,
        startedAt: null,
      },
      calledTickets: [],
      services: ["massage"],
    };

    render(
      <DeskPage
        desk={desk}
        desks={[desk]}
        services={[{ id: "massage", name: "Massage" }]}
        serviceName={() => "Massage"}
        labels={{
          deskWord: "Counter",
          deskWordLower: "counter",
          serviceWord: "Service",
          serviceWordLower: "service",
          serviceWordPluralLower: "services",
        }}
        now={10_000}
        queue={[]}
        sortedQueue={[]}
        eligibleForDesk={() => () => false}
        deskDetailTab="waiting"
        setDeskDetailTab={vi.fn()}
        deskActions={{
          completingDesk: null,
          completingTicket: null,
          startingDesk: null,
          startingTicket: null,
          skippingDesk: null,
          skippingTicket: null,
          callNext: vi.fn(),
          callTicket: vi.fn(),
          startTicketService: vi.fn(),
          completeActiveTicket: vi.fn(),
          skipActiveTicket: vi.fn(),
          updateDesk: vi.fn(),
        }}
        ticketLogs={{
          absentList: [
            {
              id: "absent-1",
              label: "A042",
              serviceId: "massage",
              skippedFromDesk: "1",
              recallRequestedAt: 2_000,
            },
            {
              id: "absent-2",
              label: "A043",
              serviceId: "massage",
              skippedFromDesk: "1",
              recallRequestedAt: 3_000,
            },
          ],
          sortedServed: [],
          servedByDeskService: {},
          absentByDeskService: {},
          removedByDeskService: {},
          removeAbsent: vi.fn(),
        }}
        waitEstimatesByTicketId={{}}
        recallAbsent={recallAbsent}
        recallServed={vi.fn()}
        askConfirm={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Recall requested")).toHaveLength(2);
    expect(screen.getByText("A042")).toBeInTheDocument();
    expect(screen.getByText("A043")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Recall" })[0]);
    expect(recallAbsent).toHaveBeenCalledWith("absent-1");
  });
});
