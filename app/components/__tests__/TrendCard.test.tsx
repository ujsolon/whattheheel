import { render, screen } from "@testing-library/react";

import { TrendCard } from "@/app/components/TrendCard";

describe("TrendCard", () => {
  it("renders a non-interactive shoe card with descriptive image text", () => {
    render(
      <TrendCard
        trend={{
          id: "loafer",
          label: "Chunky Platform Loafer",
          shoeImageUrl: "/trends/loafer.png",
          buyUrl: "https://example.com/loafer",
        }}
      />,
    );

    expect(screen.getByText("Chunky Platform Loafer")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Chunky Platform Loafer, product view",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
