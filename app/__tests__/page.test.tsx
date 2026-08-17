import { render, screen } from "@testing-library/react";

import Home from "@/app/page";

jest.mock("@/lib/data/trends", () => ({
  getTrends: () => [
    {
      id: "test-shoe",
      label: "Test Shoe",
      shoeImageUrl: "/trends/test-shoe.png",
      buyUrl: null,
    },
  ],
}));

describe("Home", () => {
  it("renders the trend feed from the data boundary", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Trending rn" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Shoe")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /buy/i })).not.toBeInTheDocument();
  });
});
