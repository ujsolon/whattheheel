import { fireEvent, render, screen } from "@testing-library/react";
import { VtoHistoryGrid } from "@/app/components/VtoHistoryGrid";

describe("VtoHistoryGrid", () => {
  it("renders nothing when there are no history items", () => {
    const { container } = render(<VtoHistoryGrid items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one image and label per item, most-recent-first order as given", () => {
    render(
      <VtoHistoryGrid
        items={[
          { taskId: "task-1", trendLabel: "Chunky Platform Loafer", resultUrl: "https://cdn.test/one.jpg", createdAt: "2026-01-02T00:00:00.000Z" },
          { taskId: "task-2", trendLabel: "Classic Stiletto", resultUrl: "https://cdn.test/two.jpg", createdAt: "2026-01-01T00:00:00.000Z" },
        ]}
      />,
    );
    expect(screen.getByText("Past Try-Ons")).toBeInTheDocument();
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "https://cdn.test/one.jpg");
    expect(images[0]).toHaveAttribute("alt", "Your past try-on: Chunky Platform Loafer");
    expect(screen.getByText("Chunky Platform Loafer")).toBeInTheDocument();
    expect(screen.getByText("Classic Stiletto")).toBeInTheDocument();
  });

  it("opens the full-image viewer for a tile on click (Story 2.7 — amends Story 2.6's view-only AC4)", () => {
    render(
      <VtoHistoryGrid
        items={[{ taskId: "task-1", trendLabel: "Chunky Platform Loafer", resultUrl: "https://cdn.test/one.jpg", createdAt: "2026-01-02T00:00:00.000Z" }]}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Chunky Platform Loafer/i }));
    expect(screen.getByRole("dialog", { name: "Full view: Chunky Platform Loafer" })).toBeInTheDocument();
  });

  it("returns focus to the originating tile when the viewer closes", () => {
    render(
      <VtoHistoryGrid
        items={[{ taskId: "task-1", trendLabel: "Chunky Platform Loafer", resultUrl: "https://cdn.test/one.jpg", createdAt: "2026-01-02T00:00:00.000Z" }]}
      />,
    );
    const tile = screen.getByRole("button", { name: /Chunky Platform Loafer/i });
    fireEvent.click(tile);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(tile).toHaveFocus();
  });
});
