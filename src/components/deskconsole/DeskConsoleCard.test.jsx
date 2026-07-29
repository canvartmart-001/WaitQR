import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeskConsoleCard } from "./DeskConsoleCard";

describe("counter recall preview", () => {
  it("prioritizes a requested recall and recalls that exact absent ticket", () => {
    const recallTicket = vi.fn();
    const cancelRecallRequest = vi.fn();
    const callNext = vi.fn();

    render(
      <DeskConsoleCard
        desk={{ id: "1", name: "Counter 1", current: null, services: ["massage"] }}
        now={Date.UTC(2026, 6, 29, 12, 0, 0)}
        serviceName={() => "Massage"}
        serviceWord="Service"
        serviceWordLower="service"
        serviceWordPluralLower="services"
        deskWordLower="counter"
        queue={[{ id: "queued-1", label: "A001", serviceId: "massage" }]}
        eligibleForDesk={() => () => true}
        recallPreview={{
          id: "absent-42",
          label: "A042",
          name: "Test customer",
          phone: "5550100",
          serviceId: "massage",
          recallRequestedAt: 2_000,
        }}
        recallTicket={recallTicket}
        cancelRecallRequest={cancelRecallRequest}
        callNext={callNext}
      />,
    );

    expect(screen.getByText("Recall requested")).toBeInTheDocument();
    expect(screen.getByText("A042")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recall" }));

    expect(recallTicket).toHaveBeenCalledWith("absent-42");
    expect(callNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelRecallRequest).toHaveBeenCalledWith("absent-42");
  });
});
