import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  estimatedServiceMs: 60_000,
  status: "queued",
};

describe("ticket position progress", () => {
  it("shows the joined position while the live queue position is loading", () => {
    const firstTicket = { ...ticket, joinedPosition: 1 };
    const view = render(
      <TicketPage
        ticketLabel={firstTicket.label}
        ticket={firstTicket}
        ticketsLoaded
        ticketPosition={null}
        ticketDeskName="Counter 1"
        waitEstimate={null}
        now={1_000}
        serviceName={() => "Massage"}
      />,
    );

    expect(view.getByText("1st")).toBeTruthy();
    expect(view.queryByText("Queue position loading")).toBeNull();
  });

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
    expect(getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("141.61 289");
  });

  it("fills the current position segment with time and never rewinds after an increased estimate", () => {
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
    const advancedDash = getByTestId("queue-position-progress").getAttribute("stroke-dasharray");
    expect(advancedDash).not.toBe(initialDash);

    rerender(
      <TicketPage
        {...props}
        now={31_000}
        waitEstimate={{
          ...waitEstimate,
          predictedStartAt: 121_000,
          positionStepStartedAt: 31_000,
          positionStepEndsAt: 121_000,
          estimatedServiceMs: 120_000,
        }}
      />,
    );

    expect(getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe(advancedDash);
  });

  it("keeps filling the final queue segment while first and completes when called", () => {
    const props = {
      ticketLabel: ticket.label,
      ticket,
      ticketsLoaded: true,
      ticketPosition: 1,
      ticketDeskName: "Counter 1",
      waitEstimate,
      serviceName: () => "Massage",
    };
    const view = render(<TicketPage {...props} now={1_000} />);

    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("260.1 289");

    view.rerender(<TicketPage {...props} now={31_000} />);
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("274.55 289");

    view.rerender(<TicketPage {...props} ticket={{ ...ticket, status: "called" }} now={61_000} />);
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("289 289");
  });

  it("never rewinds when a refreshed queue position is worse", () => {
    const props = {
      ticketLabel: ticket.label,
      ticket,
      ticketsLoaded: true,
      ticketDeskName: "Counter 1",
      waitEstimate,
      now: 1_000,
      serviceName: () => "Massage",
    };
    const view = render(<TicketPage {...props} ticketPosition={3} />);
    const advancedDash = view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray");

    view.rerender(<TicketPage {...props} ticketPosition={5} />);

    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe(advancedDash);
  });
});

describe("ticket lifecycle messages", () => {
  const baseProps = {
    ticketLabel: ticket.label,
    ticketsLoaded: true,
    ticketPosition: null,
    ticketDeskName: "Counter 1",
    waitEstimate: null,
    now: 1_000,
    serviceName: () => "Massage",
    services: [{ id: "service-1", name: "Massage", price: "40" }],
  };

  it.each([
    ["serving", "Now serving"],
    ["completed", "Completed"],
    ["skipped", "You were missed"],
    ["removed", "Ticket removed"],
  ])("shows the correct %s state", (status, heading) => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status }}
      />,
    );

    expect(view.getByText(heading)).toBeTruthy();
    expect(view.queryByText(/ahead of you/i)).toBeNull();
    expect(view.queryByText(/next in line/i)).toBeNull();
  });

  it("shows a check mark inside the ring when completed", () => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "completed" }}
      />,
    );

    expect(view.getByTestId("completed-check")).toBeTruthy();
  });

  it("hides queue and wait details after a ticket is called", () => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "called" }}
      />,
    );

    expect(view.getByText("You're called")).toBeTruthy();
    expect(view.queryByText("Estimated wait")).toBeNull();
    expect(view.queryByText(/ahead of you/i)).toBeNull();
  });

  it("uses the black ticket-details panel, dashboard service icon, and site footer", () => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "queued" }}
        ticketPosition={1}
      />,
    );
    const detailsPanel = view.getByRole("region", { name: "Ticket details" });

    expect(detailsPanel.style.backgroundColor).toBe("rgb(0, 0, 0)");
    expect(detailsPanel.classList.contains("border")).toBe(false);
    expect(detailsPanel.querySelector(".lucide-layers3")).toBeTruthy();
    expect(view.getByText(/All rights reserved/)).toBeTruthy();
  });

  it("shows live serving time and the completed timestamp", async () => {
    const servingTicket = {
      ...ticket,
      status: "serving",
      startedAt: 1_000,
      publicToken: "Yx8p4X2aGmHj6Qn9RkT3VwZbLcDf5S7u",
    };
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={servingTicket}
        now={61_000}
      />,
    );

    expect(view.getByText("1:00")).toBeTruthy();
    expect(view.queryByText("Serving 1:00")).toBeNull();
    expect(view.queryByRole("button", { name: "Exit ticket" })).toBeNull();

    view.rerender(
      <TicketPage
        {...baseProps}
        ticket={{
          ...servingTicket,
          status: "completed",
          completedAt: new Date(2026, 6, 30, 12, 58).getTime(),
        }}
        now={new Date(2026, 6, 30, 13, 30).getTime()}
      />,
    );
    await waitFor(() => expect(view.getByText("Today, 12.58 PM")).toBeTruthy());
    expect(view.queryByRole("button", { name: "Exit ticket" })).toBeNull();
  });

  it("saves completed-ticket feedback and displays the selected rating", async () => {
    const completedTicket = {
      ...ticket,
      status: "completed",
      completedAt: Date.now(),
      servedByMemberId: "MEM1",
      servedByMemberName: "Alex Smith",
      publicToken: "Yx8p4X2aGmHj6Qn9RkT3VwZbLcDf5S7u",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ submission: { ...completedTicket, feedbackRating: 5 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = render(
      <TicketPage
        {...baseProps}
        ticket={completedTicket}
        members={[{ id: "UPDATED-MEMBER-ID", name: "Alex Smith", photo: "data:image/png;base64,avatar" }]}
      />,
    );

    expect(view.getByText("Alex Smith")).toBeTruthy();
    expect(view.getByRole("img", { name: "Alex Smith" }).getAttribute("src")).toBe("data:image/png;base64,avatar");
    expect(view.queryByText("Poor")).toBeNull();
    expect(view.queryByText("Excellent")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "5 stars, Excellent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/submissions/public/${completedTicket.publicToken}/rating`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ rating: 5 }),
      }),
    ));
    await waitFor(() => expect(view.getByRole("button", { name: "5 stars, Excellent" }).getAttribute("aria-pressed")).toBe("true"));
    expect(view.getByText("Excellent")).toBeTruthy();
    expect(view.queryByText("Poor")).toBeNull();
    expect(view.getByRole("button", { name: "1 stars, Poor" }).querySelector("svg").getAttribute("fill")).toBe("currentColor");
    expect(view.getByRole("button", { name: "5 stars, Excellent" }).querySelector("svg").getAttribute("fill")).toBe("currentColor");
  });

  it.each(["queued", "called"])("shows exit for a %s ticket", (status) => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{
          ...ticket,
          status,
          publicToken: "Yx8p4X2aGmHj6Qn9RkT3VwZbLcDf5S7u",
        }}
      />,
    );

    expect(view.getByRole("button", { name: "Exit ticket" })).toBeTruthy();
  });

  it("confirms and permanently deletes a private-link ticket", async () => {
    const privateTicket = {
      ...ticket,
      publicToken: "Yx8p4X2aGmHj6Qn9RkT3VwZbLcDf5S7u",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(
      <TicketPage
        {...baseProps}
        ticketLabel={privateTicket.publicToken}
        ticket={privateTicket}
        ticketPosition={1}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "Exit ticket" }));
    expect(view.getByText("Are you sure?")).toBeTruthy();
    expect(view.getByText("!")).toBeTruthy();
    expect(view.getByText(/You will lose your position in the queue/)).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Exit queue" }));

    await waitFor(() => expect(view.getByText("Ticket deleted")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/submissions/public/${privateTicket.publicToken}`,
      { method: "DELETE" },
    );
    vi.unstubAllGlobals();
  });

  it("updates the mobile address-bar color with the live ticket status", async () => {
    const themeMeta = document.createElement("meta");
    themeMeta.setAttribute("name", "theme-color");
    themeMeta.setAttribute("content", "#12151B");
    document.head.appendChild(themeMeta);
    const props = {
      ...baseProps,
      theme: { accentColor: "#2563EB" },
    };
    const view = render(<TicketPage {...props} ticket={{ ...ticket, status: "queued" }} />);

    await waitFor(() => expect(themeMeta.getAttribute("content")).toBe("#2563EB"));

    view.rerender(<TicketPage {...props} ticket={{ ...ticket, status: "called" }} />);
    await waitFor(() => expect(themeMeta.getAttribute("content")).toBe("#E8A33D"));

    view.rerender(<TicketPage {...props} ticket={{ ...ticket, status: "skipped" }} />);
    await waitFor(() => expect(themeMeta.getAttribute("content")).toBe("#E2614F"));

    view.rerender(<TicketPage {...props} ticket={{ ...ticket, status: "serving" }} />);
    await waitFor(() => expect(themeMeta.getAttribute("content")).toBe("#4FB286"));

    view.unmount();
    expect(themeMeta.getAttribute("content")).toBe("#12151B");
    themeMeta.remove();
  });

  it("updates status and completed/absent ring colors without a refresh", async () => {
    const view = render(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "queued" }}
        ticketPosition={1}
      />,
    );

    view.rerender(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "called" }}
      />,
    );
    await waitFor(() => expect(view.getByText("You're called")).toBeTruthy());
    expect(view.getByTestId("ticket-service-value").style.color).toBe("rgb(232, 163, 61)");
    expect(view.getByTestId("ticket-counter-value").style.color).toBe("rgb(232, 163, 61)");

    view.rerender(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "skipped" }}
      />,
    );
    await waitFor(() => expect(view.getByText("You were missed")).toBeTruthy());
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke")).toBe("#E2614F");
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("289 289");
    expect(view.getByTestId("ticket-service-value").style.color).toBe("rgb(226, 97, 79)");
    expect(view.getByTestId("ticket-counter-value").style.color).toBe("rgb(226, 97, 79)");

    view.rerender(
      <TicketPage
        {...baseProps}
        ticket={{ ...ticket, status: "completed" }}
      />,
    );
    await waitFor(() => expect(view.getByText("Completed")).toBeTruthy());
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke")).toBe("#4FB286");
    expect(view.getByTestId("queue-position-progress").getAttribute("stroke-dasharray")).toBe("289 289");
    expect(view.getByTestId("ticket-service-value").style.color).toBe("rgb(79, 178, 134)");
    expect(view.getByTestId("ticket-counter-value").style.color).toBe("rgb(139, 145, 156)");
    expect(view.getByText("$40")).toBeTruthy();
  });

  it("lets an absent customer request a recall", async () => {
    const absentTicket = { ...ticket, status: "skipped" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        submission: { ...absentTicket, recallRequestedAt: 2_000 },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<TicketPage {...baseProps} ticket={absentTicket} />);
    fireEvent.click(view.getByRole("button", { name: "Recall me" }));

    await waitFor(() => expect(view.getByText("Recall requested")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/submissions/42/recall-request", { method: "PATCH" });
    vi.unstubAllGlobals();
  });
});
