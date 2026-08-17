import { render } from "@testing-library/react";

import RootLayout, { viewport } from "@/app/layout";

describe("RootLayout", () => {
  it("renders its children", () => {
    const layout = RootLayout({
      children: <main>Test content</main>,
      params: Promise.resolve({}),
    });

    const { getByText } = render(layout.props.children);

    expect(getByText("Test content")).toBeInTheDocument();
  });

  it("enables edge-to-edge safe-area viewport handling", () => {
    expect(viewport).toMatchObject({ viewportFit: "cover" });
  });
});
