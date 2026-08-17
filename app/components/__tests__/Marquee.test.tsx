import { render, screen } from "@testing-library/react";

import { Marquee } from "@/app/components/Marquee";

describe("Marquee", () => {
  it("announces the ticker copy once", () => {
    render(<Marquee />);

    expect(
      screen.getAllByText("NEW DROPS DAILY ★ Y2K IS BACK ★ COP BEFORE IT'S GONE"),
    ).toHaveLength(2);
    expect(screen.getByTestId("marquee-copy")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("marquee-copy").parentElement?.parentElement).not.toHaveAttribute(
      "tabindex",
    );
  });
});
