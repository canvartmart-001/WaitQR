import { describe, expect, it } from "vitest";
import { findTicketLabelByPath, getTicketPath, isTicketLabelPath } from "./routing";

describe("private ticket routes", () => {
  const publicToken = "Yx8p4X2aGmHj6Qn9RkT3VwZbLcDf5S7u";

  it("builds and reads an unguessable public-token route", () => {
    const path = getTicketPath({ label: "A042", publicToken });

    expect(path).toBe(`/t/${publicToken}`);
    expect(isTicketLabelPath(path)).toBe(true);
    expect(findTicketLabelByPath(path)).toBe(publicToken);
  });

  it("keeps legacy ticket-label routes readable", () => {
    expect(getTicketPath("A042")).toBe("/A042");
    expect(isTicketLabelPath("/A042")).toBe(true);
    expect(findTicketLabelByPath("/A042")).toBe("A042");
  });
});
