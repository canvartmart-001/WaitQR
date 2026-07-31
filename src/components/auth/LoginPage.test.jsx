import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { LoginPage } from "./LoginPage";

const theme = {
  accentColor: "#2563eb",
  bgColor: "#ffffff",
  fontColor: "#111827",
  borderColor: "#e5e7eb",
  radius: 8,
};

test("offers create password when identifier matches a member without password", () => {
  const onNavigate = vi.fn();

  render(
    <LoginPage
      members={[{ id: "member-1", name: "John Due", email: "john@example.com", phone: "123456789", password: "" }]}
      theme={theme}
      loading={false}
      onNavigate={onNavigate}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("Employee ID, email, or phone"), {
    target: { value: "john@example.com" },
  });

  const createButton = screen.getByRole("button", { name: "Create password" });
  fireEvent.click(createButton);

  expect(onNavigate).toHaveBeenCalledWith("/create-password");
});

test("keeps login action when matched member already has password", () => {
  render(
    <LoginPage
      members={[{ id: "member-1", name: "John Due", email: "john@example.com", phone: "123456789", password: "secret" }]}
      theme={theme}
      loading={false}
      onNavigate={vi.fn()}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("Employee ID, email, or phone"), {
    target: { value: "john@example.com" },
  });

  expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
});
