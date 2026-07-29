import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketPage } from "./TicketPage";

const ticket = {
  id: "42",
  label: "A042",
  serviceId: "service-1",
  joinedPosition: 5,
  status: "queued",
  createdAt: 1_000,
};

const waitEstimate = {
  predictedStartAt: 61_000,
  positionStepStartedAt: 1_000,
  positionStepEndsAt: 61_000,
  status: "queued",
};

describe("ticket position progress", () => {
  it("updates the ring when the live queue position changes", () => {
    const props = {
      ticketLabel: ticket.label,
      ticket,
      ticketsLoaded: true,
      ticketDeskName: "Counter 1",
      waitEstimate,
      now: 1_000,
      serviceName: () => "Massage",
      theme: {
        accentColor: "#2563eb",
        bgColor: "#04060b",
        fontColor: "#e2e8f0",
        borderColor: "#171d2b",
        radius: 8,
      },
    };
    const { getByTestId, rerender } = render(<TicketPage {...props} ticketPosition={5} />);
    const initialDash = getByTestId("queue-position-progress").getAttribute("stroke-dasharray");

    rerender(<TicketPage {...props} ticketPosition={3} />);

    expect(getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).not.toBe(initialDash);
    expect(getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("144.5 289");
  });

  it("fills the current position segment as its predicted time passes", () => {
    const props = {
      ticketLabel: ticket.label,
      ticket,
      ticketsLoaded: true,
      ticketPosition: 5,
      ticketDeskName: "Counter 1",
      waitEstimate,
      serviceName: () => "Massage",
    };
    const { getByTestId, rerender } = render(<TicketPage {...props} now={1_000} />);
    const initialDash = getByTestId("queue-position-progress").getAttribute("stroke-dasharray");

    rerender(<TicketPage {...props} now={31_000} />);

    expect(getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).not.toBe(initialDash);
  });
});
