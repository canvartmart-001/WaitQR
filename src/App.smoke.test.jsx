import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import App from "./App";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
  if (!SVGElement.prototype.getTotalLength) {
    SVGElement.prototype.getTotalLength = () => 100;
  }
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

test("renders the WaitQR app shell", async () => {
  window.localStorage.setItem("waitqr:master-login", "true");

  render(<App />);

  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Settings" }).length).toBeGreaterThan(0);
  expect(screen.queryByText("Desk 1")).not.toBeInTheDocument();
});
