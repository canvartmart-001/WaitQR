import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TicketTabsPanel } from "./TicketTabsPanel";

const theme = {
  accentColor: "#2563eb",
  fontColor: "#111827",
  borderColor: "#e5e7eb",
  radius: 8,
};

test("filters counter waiting list by member assigned services", () => {
  const desk = { id: "desk-1", name: "Counter 1", services: ["hair", "massage"] };

  render(
    <TicketTabsPanel
      desks={[desk]}
      selectedDeskFilter="desk-1"
      theme={theme}
      deskDetailTab="waiting"
      setDeskDetailTab={vi.fn()}
      sortedQueue={[
        { id: "ticket-1", label: "A001", name: "Hair client", serviceId: "hair", deskId: "desk-1", createdAt: 1_000 },
        { id: "ticket-2", label: "A002", name: "Massage client", serviceId: "massage", deskId: "desk-1", createdAt: 2_000 },
      ]}
      absentList={[]}
      sortedServed={[]}
      services={[
        { id: "hair", name: "Hair Cut" },
        { id: "massage", name: "Massage" },
      ]}
      eligibleForDesk={() => () => true}
      now={10_000}
      serviceName={(id) => (id === "hair" ? "Hair Cut" : "Massage")}
      serviceWordPluralLower="services"
      deskWord="Counter"
      callTicket={vi.fn()}
      waitEstimatesByTicketId={{}}
      recallAbsent={vi.fn()}
      recallServed={vi.fn()}
      removeAbsent={vi.fn()}
      askConfirm={vi.fn()}
      servedByDeskService={{}}
      absentByDeskService={{}}
      removedByDeskService={{}}
      memberServiceFilter={["hair"]}
    />,
  );

  expect(screen.getByText("A001")).toBeInTheDocument();
  expect(screen.queryByText("A002")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Waiting\s+1/i })).toBeInTheDocument();
});
