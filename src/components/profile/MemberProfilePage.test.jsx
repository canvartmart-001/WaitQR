import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MemberProfilePage, counterActivityInsights, memberServiceInsights } from "./MemberProfilePage";

const member = {
  id: "member-1",
  name: "John Due",
  role: "Member",
  status: "Active",
  email: "john@example.com",
  phone: "123456789",
  deskIds: ["desk-1"],
  serviceIds: ["hair", "massage"],
};

const services = [
  { id: "hair", name: "Hair Cut" },
  { id: "massage", name: "Massage" },
];

const submissions = [
  {
    id: "ticket-1",
    status: "completed",
    deskId: "desk-1",
    serviceId: "hair",
    servedByMemberId: "member-1",
    startedAt: 1_000,
    completedAt: 601_000,
    feedbackRating: 5,
  },
  {
    id: "ticket-2",
    status: "completed",
    deskId: "desk-1",
    serviceId: "hair",
    servedByMemberId: "member-1",
    startedAt: 2_000,
    completedAt: 902_000,
    feedbackRating: 3,
  },
  {
    id: "ticket-3",
    status: "completed",
    deskId: "desk-1",
    serviceId: "hair",
    servedByMemberId: "someone-else",
    startedAt: 1_000,
    completedAt: 3_601_000,
    feedbackRating: 1,
  },
  { id: "ticket-4", status: "queued", deskId: "desk-1", serviceId: "hair" },
  { id: "ticket-5", status: "called", deskId: "desk-1", serviceId: "massage" },
  { id: "ticket-6", status: "skipped", deskId: "desk-1", serviceId: "hair" },
  {
    id: "ticket-7",
    status: "completed",
    deskId: "desk-2",
    serviceId: "hair",
    servedByMemberId: "member-1",
    startedAt: 4_000,
    completedAt: 604_000,
    feedbackRating: 5,
  },
  {
    id: "ticket-8",
    status: "completed",
    deskId: "desk-1",
    serviceId: "massage",
    servedByMemberId: "member-1",
  },
  {
    id: "ticket-9",
    status: "queued",
    deskId: "desk-2",
    serviceId: "hair",
  },
];

const theme = {
  accentColor: "#2563eb",
  bgColor: "#ffffff",
  fontColor: "#111827",
  borderColor: "#e5e7eb",
  radius: 8,
  themeMode: "Light",
};

test("calculates service and overall insights from the selected member's completed work", () => {
  const insights = memberServiceInsights(member, services, submissions, 1_000_000);

  expect(insights.averageRating).toBeCloseTo(4.33, 1);
  expect(insights.ratingCount).toBe(3);
  expect(insights.services[0].waitingCount).toBe(1);
  expect(insights.services[0].absentCount).toBe(1);
  expect(insights.services[0].averageRating).toBeCloseTo(4.33, 1);
  expect(insights.services[0].servedCount).toBe(3);
  expect(insights.services[0].durationSampleCount).toBe(3);
  expect(insights.services[0].estimatedServiceMs).toBeCloseTo(700_000, -3);
  expect(insights.services[1].estimatedServiceMs).toBeNull();
});

test("calculates activity totals for each assigned counter", () => {
  const insights = counterActivityInsights([{ id: "desk-1", name: "Desk 1" }], submissions);

  expect(insights[0]).toMatchObject({
    waitingCount: 2,
    absentCount: 1,
    servedCount: 4,
  });

  const memberScopedInsights = counterActivityInsights([{ id: "desk-1", name: "Desk 1" }], submissions, { ...member, serviceIds: ["hair"] });

  expect(memberScopedInsights[0]).toMatchObject({
    waitingCount: 1,
    absentCount: 1,
    servedCount: 3,
  });
});

test("renders assigned services as rows with estimates and ratings", () => {
  const onNavigate = vi.fn();

  render(
    <MemberProfilePage
      member={{ ...member, deskIds: ["desk-1"], serviceIds: ["hair"] }}
      desks={[{ id: "desk-1", name: "Desk 1" }, { id: "desk-2", name: "Desk 2" }]}
      services={services}
      submissions={submissions}
      labels={{ memberWord: "Member", serviceWordPlural: "Services" }}
      theme={theme}
      loggedInMember={member}
      members={[member]}
      onNavigate={onNavigate}
    />,
  );

  expect(screen.getByRole("heading", { name: "John Due" })).toBeInTheDocument();
  expect(screen.getByText("Counter 2")).toBeInTheDocument();
  expect(screen.getByLabelText("Waiting 1, show services")).toBeInTheDocument();
  expect(screen.getByLabelText("Absent 1, show services")).toBeInTheDocument();
  expect(screen.getByLabelText("Served 3, show services")).toBeInTheDocument();
  expect(screen.queryByText("Est. 12 min")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Served 3, show services"));
  expect(onNavigate).not.toHaveBeenCalled();
  expect(screen.queryByText("Est. 12 min")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Hair Cut 2 served")).toBeInTheDocument();
  expect(screen.getByLabelText("Massage 1 served")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Served 1, show services"));
  expect(screen.getByLabelText("Hair Cut 1 served")).toBeInTheDocument();
  expect(screen.getAllByText("Waiting")).toHaveLength(1);
  expect(screen.getAllByText("Absent")).toHaveLength(1);
  expect(screen.getAllByText("Served")).toHaveLength(2);
  expect(screen.queryByLabelText("No ratings yet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Counter 1"));
  expect(onNavigate).toHaveBeenCalledWith("/counters/desk-1");
  fireEvent.click(screen.getByRole("button", { name: "Services" }));
  expect(screen.getAllByLabelText("4.3 out of 5 from 3 ratings")).toHaveLength(2);
  expect(screen.getByText("Est. 12 min")).toBeInTheDocument();
  expect(screen.getByText("Est. pending")).toBeInTheDocument();
  expect(screen.getByLabelText("No ratings yet")).toBeInTheDocument();
  expect(screen.getByLabelText("Hair Cut 1 waiting")).toBeInTheDocument();
  expect(screen.getByLabelText("Hair Cut 1 absent")).toBeInTheDocument();
  expect(screen.getByLabelText("Hair Cut 3 served")).toBeInTheDocument();
  expect(screen.getByLabelText("Massage 1 served")).toBeInTheDocument();
});

test("lets an administrator view another member profile without member login", () => {
  render(
    <MemberProfilePage
      member={member}
      desks={[{ id: "desk-1", name: "Desk 1" }]}
      services={services}
      submissions={submissions}
      labels={{ memberWord: "Member", serviceWordPlural: "Services" }}
      theme={theme}
      loggedInMember={{ id: "admin-1", name: "Admin User", role: "Administrator" }}
      members={[member, { id: "admin-1", name: "Admin User", role: "Administrator" }]}
      onUpdateMember={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "John Due" })).toBeInTheDocument();
  expect(screen.getByText("john@example.com")).toBeInTheDocument();
  expect(screen.queryByText("Sign in to access this account.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Edit profile" })).toBeInTheDocument();
});

test("hides counter and service tabs for administrator profiles", () => {
  render(
    <MemberProfilePage
      member={{ ...member, role: "Administrator" }}
      desks={[{ id: "desk-1", name: "Desk 1" }]}
      services={services}
      submissions={submissions}
      labels={{ memberWord: "Member", serviceWordPlural: "Services" }}
      theme={theme}
      loggedInMember={{ id: "admin-1", name: "Admin User", role: "Administrator" }}
      members={[member]}
    />,
  );

  expect(screen.queryByRole("button", { name: "Counters" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Services" })).not.toBeInTheDocument();
  expect(screen.queryByText("Counter 1")).not.toBeInTheDocument();
});

test("hides only the services tab for receptionist profiles", () => {
  render(
    <MemberProfilePage
      member={{ ...member, role: "Receptionist", serviceIds: [] }}
      desks={[{ id: "desk-1", name: "Desk 1" }]}
      services={services}
      submissions={submissions}
      labels={{ memberWord: "Member", serviceWordPlural: "Services" }}
      theme={theme}
      loggedInMember={{ id: "admin-1", name: "Admin User", role: "Administrator" }}
      members={[member]}
    />,
  );

  expect(screen.queryByRole("button", { name: "Services" })).not.toBeInTheDocument();
  expect(screen.getByText("Counter 1")).toBeInTheDocument();
});
