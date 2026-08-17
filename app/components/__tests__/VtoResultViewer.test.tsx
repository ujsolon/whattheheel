import { fireEvent, render, screen } from "@testing-library/react";
import { VtoResultViewer } from "@/app/components/VtoResultViewer";

const item = {
  taskId: "task-1",
  trendLabel: "Chunky Platform Loafer",
  resultUrl: "https://cdn.test/result.jpg",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("VtoResultViewer", () => {
  beforeEach(() => {
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      value: class extends MouseEvent {
        pointerId: number;
        pointerType: string;

        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
          this.pointerType = init.pointerType ?? "";
        }
      },
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: jest.fn() });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: jest.fn() });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: jest.fn(() => true) });
  });

  it("renders as an accessible dialog with the full image", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: "Full view: Chunky Platform Loafer" })).toBeInTheDocument();
    expect(screen.getByAltText("Your past try-on: Chunky Platform Loafer")).toHaveAttribute("src", item.resultUrl);
  });

  it("starts at 1x zoom, reflected in the visible range control", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    expect(screen.getByRole("slider")).toHaveValue("1");
  });

  it("zooms in via the + button, clamped at 3x", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    for (let i = 0; i < 10; i += 1) fireEvent.click(zoomIn);
    expect(screen.getByRole("slider")).toHaveValue("3");
  });

  it("zooms out via the - button, clamped at 1x", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    for (let i = 0; i < 10; i += 1) fireEvent.click(zoomOut);
    expect(screen.getByRole("slider")).toHaveValue("1");
  });

  it("zooms via the visible range slider directly", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "2.5" } });
    expect(screen.getByRole("slider")).toHaveValue("2.5");
  });

  it("closes on Escape", () => {
    const onClose = jest.fn();
    render(<VtoResultViewer item={item} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on clicking the close control", () => {
    const onClose = jest.fn();
    render(<VtoResultViewer item={item} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on clicking the backdrop outside the image", () => {
    const onClose = jest.fn();
    render(<VtoResultViewer item={item} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking the image itself", () => {
    const onClose = jest.fn();
    render(<VtoResultViewer item={item} onClose={onClose} />);
    fireEvent.click(screen.getByAltText("Your past try-on: Chunky Platform Loafer"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("zooms in on a two-pointer pinch gesture", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 120, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 220, clientY: 100 });

    expect(Number((screen.getByRole("slider") as HTMLInputElement).value)).toBeGreaterThan(1);
  });

  it("moves focus onto the close control on open", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });
});
