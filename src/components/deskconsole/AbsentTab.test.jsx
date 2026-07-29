import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { C } from "../../lib/theme";
import { AbsentTab } from "./AbsentTab";

describe("absent recall request", () => {
  it("turns the counter recall action green after a customer request", () => {
    const view = render(
      <AbsentTab
        filteredAbsent={[{
          id: "42",
          label: "A042",
          type: "general",
          serviceId: "service-1",
          skippedFromDesk: "1",
          recallRequestedAt: 2_000,
        }]}
        desks={[{ id: "1", name: "Counter 1" }]}
        now={3_000}
        serviceName={() => "Massage"}
        recallAbsent={vi.fn()}
        removeAbsent={vi.fn()}
      />,
    );

    const recallButton = view.getByRole("button", { name: "Recall ticket" });
    expect(recallButton.style.color).toBe("rgb(79, 178, 134)");
    expect(recallButton.style.background).toBe("rgba(79, 178, 134, 0.14)");
    expect(C.teal).toBe("#4FB286");
  });
});
