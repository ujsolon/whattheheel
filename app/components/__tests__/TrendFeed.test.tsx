import { render, screen } from "@testing-library/react";

import { TrendFeed } from "@/app/components/TrendFeed";

describe("TrendFeed", () => {
  it("renders one card per trend", () => {
    render(
      <TrendFeed
        trends={[
          {
            id: "runner",
            label: "Metallic Retro Runner",
            shoeImageUrl: "/trends/runner.png",
            buyUrl: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Metallic Retro Runner")).toBeInTheDocument();
  });

  it("renders the exact empty-state message", () => {
    render(<TrendFeed trends={[]} />);

    expect(
      screen.getByText("No trends right now — check back soon."),
    ).toBeInTheDocument();
  });
});
