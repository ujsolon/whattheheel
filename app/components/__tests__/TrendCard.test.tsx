import { render, screen } from "@testing-library/react";

import { TrendCard } from "@/app/components/TrendCard";

describe("TrendCard", () => {
  it("links the whole shoe card to its trusted preview id", () => {
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
    expect(screen.getByRole("link", { name: "Chunky Platform Loafer" })).toHaveAttribute(
      "href",
      "/preview?trend=loafer",
    );
  });
});
