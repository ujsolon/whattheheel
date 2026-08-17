import { render, screen } from "@testing-library/react";

import PreviewPage from "@/app/preview/page";

jest.mock("@/lib/data/trends", () => ({
  getTrendById: (id: string) =>
    id === "loafer"
      ? { id, label: "Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: null }
      : undefined,
}));

describe("PreviewPage", () => {
  it("passes only a resolved trend to the overlay", async () => {
    render(await PreviewPage({ searchParams: Promise.resolve({ trend: "loafer" }) }));

    expect(screen.getByRole("heading", { name: /preview loafer/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Your foot photo")).toHaveAttribute("type", "file");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each([{}, { trend: "stale" }, { trend: ["loafer", "stale"] }])(
    "renders a recoverable state for invalid selection %#",
    async (searchParams) => {
      render(await PreviewPage({ searchParams: Promise.resolve(searchParams) }));

      expect(screen.getByRole("link", { name: /choose a trend/i })).toHaveAttribute("href", "/");
    },
  );
});
