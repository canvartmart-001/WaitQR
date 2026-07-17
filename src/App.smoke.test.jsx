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

test("renders the WaitQR app shell", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Settings" }).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Desk 1").length).toBeGreaterThan(0);
});
