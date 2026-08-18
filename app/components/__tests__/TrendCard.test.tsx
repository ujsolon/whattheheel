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

  it("uses a custom hrefBuilder when supplied, instead of the default preview destination", () => {
    render(
      <TrendCard
        trend={{ id: "loafer", label: "Chunky Platform Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: null }}
        hrefBuilder={(trend) => `/stylist?trend=${trend.id}`}
      />,
    );

    expect(screen.getByRole("link", { name: "Chunky Platform Loafer" })).toHaveAttribute(
      "href",
      "/stylist?trend=loafer",
    );
  });

  // Story 2.8: a shopper must be able to reach a retailer from the Feed without
  // spending a YouCam generation.
  it("exposes a Buy Now action on the feed card when the trend has a retail URL", () => {
    const retail = { id: "loafer", label: "Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: "https://retailer.example/p/loafer" };
    render(<TrendCard trend={retail} showBuyLink />);

    const buy = screen.getByRole("link", { name: /buy now/i });
    expect(buy).toHaveAttribute("href", retail.buyUrl);
    expect(buy).toHaveAttribute("target", "_blank");
    expect(buy).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    // The card's own try-on target still exists and is a separate element.
    const tryOn = screen.getByRole("link", { name: "Loafer" });
    expect(tryOn).toHaveAttribute("href", "/preview?trend=loafer");
    expect(tryOn).not.toBe(buy);
  });

  // AC4: nesting an <a> inside an <a> is invalid HTML and browsers re-parent it,
  // silently breaking one of the two actions.
  it("never nests the Buy Now action inside the card's primary target", () => {
    const retail = { id: "loafer", label: "Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: "https://retailer.example/p/loafer" };
    const { container } = render(<TrendCard trend={retail} showBuyLink />);

    expect(container.querySelector("a a")).toBeNull();
    expect(container.querySelector("button a")).toBeNull();
    expect(container.querySelector("a button")).toBeNull();
  });

  it("omits Buy Now when the trend has no retail URL, even with showBuyLink set", () => {
    render(<TrendCard trend={{ id: "x", label: "X", shoeImageUrl: "/trends/x.png", buyUrl: null }} showBuyLink />);
    expect(screen.queryByRole("link", { name: /buy now/i })).not.toBeInTheDocument();
  });

  // AC5: the stylist picker is a selection control mid-flow; an outbound link
  // there would derail the trigger.
  it("omits Buy Now in the compact picker variant regardless of retail URL", () => {
    const retail = { id: "loafer", label: "Loafer", shoeImageUrl: "/trends/loafer.png", buyUrl: "https://retailer.example/p/loafer" };
    render(<TrendCard trend={retail} compact onSelect={jest.fn()} />);
    expect(screen.queryByRole("link", { name: /buy now/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loafer" })).toBeInTheDocument();
  });
});
