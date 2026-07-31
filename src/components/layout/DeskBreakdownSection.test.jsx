import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeskBreakdownSection } from "./DeskBreakdownSection";

const theme = {
  accentColor: "#2563eb",
  bgColor: "#ffffff",
  fontColor: "#111827",
  borderColor: "#e5e7eb",
  radius: 8,
};

test("uses active theme colors for counter rail tickets and popup", () => {
  render(
    <div style={{ "--surface-bg": theme.bgColor }}>
      <DeskBreakdownSection
        embedded
        theme={theme}
        desks={[{ id: "desk-1", name: "Counter 1", services: ["hair"], status: "Available" }]}
        members={[
          { id: "member-1", name: "Ripa", deskIds: ["desk-1"] },
          { id: "member-2", name: "Sumi", deskIds: ["desk-1"] },
        ]}
        deskWord="Counter"
        deskWordPluralLower="counters"
        servedByDesk={{}}
        absentByDesk={{}}
        removedByDesk={{}}
        waitingByDesk={{ "desk-1": 1 }}
        sortedQueue={[{ id: "ticket-1", label: "A001", name: "Jane", serviceId: "hair", deskId: "desk-1", createdAt: 1_000 }]}
        sortedServed={[]}
        absentList={[]}
        removedLog={[]}
        serviceName={() => "Hair Cut"}
        now={10_000}
        getDeskPath={() => "/counters/counter-1"}
      />
    </div>,
  );

  expect(screen.getByLabelText("Open")).toBeInTheDocument();
  expect(screen.getByText("2 members")).toBeInTheDocument();
  const ticket = screen.getByRole("button", { name: /A001/i });
  expect(ticket).toHaveStyle({ color: theme.fontColor });

  fireEvent.click(ticket);

  expect(screen.getByText("A001 · Jane")).toHaveStyle({ color: theme.fontColor });
  expect(screen.getByText("Customer: Jane")).toHaveStyle({ borderColor: theme.borderColor });
});
