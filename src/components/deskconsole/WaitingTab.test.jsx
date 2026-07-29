import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WaitingTab } from "./WaitingTab";

describe("counter waiting-list countdown", () => {
  it("shows the shared estimate and counts down from its fixed target time", () => {
    const now = Date.UTC(2026, 6, 29, 12, 0, 0);
    const ticket = {
      id: "42",
      label: "A042",
      name: "Test customer",
      phone: "5550100",
      serviceId: "hair",
      type: "general",
      createdAt: now - 60_000,
    };
    const props = {
      filteredWaiting: [ticket],
      queuedWaiting: [ticket],
      selectedDesk: null,
      serviceName: () => "Hair",
      waitEstimatesByTicketId: {
        "42": {
          submissionId: "42",
          status: "queued",
          predictedStartAt: now + 125_000,
        },
      },
    };
    const { rerender } = render(<WaitingTab {...props} now={now} />);

    expect(screen.getByText("Joined 1m ago | Wait 2m 5s")).toBeInTheDocument();

    rerender(<WaitingTab {...props} now={now + 5_000} />);
    expect(screen.getByText("Joined 1m ago | Wait 2m 0s")).toBeInTheDocument();
  });
});
