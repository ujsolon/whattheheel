import { fireEvent, render, screen } from "@testing-library/react";
import { VtoResultViewer } from "@/app/components/VtoResultViewer";

const item = {
  taskId: "task-1",
  trendLabel: "Chunky Platform Loafer",
  resultUrl: "https://cdn.test/result.jpg",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const ORIGINAL_SET_CAPTURE = HTMLElement.prototype.setPointerCapture;
const ORIGINAL_RELEASE_CAPTURE = HTMLElement.prototype.releasePointerCapture;
const ORIGINAL_HAS_CAPTURE = HTMLElement.prototype.hasPointerCapture;

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

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { configurable: true, value: ORIGINAL_SET_CAPTURE });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { configurable: true, value: ORIGINAL_RELEASE_CAPTURE });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { configurable: true, value: ORIGINAL_HAS_CAPTURE });
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

  it("ignores a non-numeric range value instead of setting zoom to NaN", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "not-a-number" } });
    const image = screen.getByAltText("Your past try-on: Chunky Platform Loafer");
    expect(image.style.transform).not.toContain("NaN");
  });

  it("has a static, non-value-mutating accessible name via a paired label", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByLabelText(/Zoom: 1\.25/)).toBe(screen.getByRole("slider"));
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

  it("does not close when a drag starting on the stage releases over the backdrop", () => {
    const onClose = jest.fn();
    render(<VtoResultViewer item={item} onClose={onClose} />);
    const stage = screen.getByTestId("vto-viewer-stage");
    const dialog = screen.getByRole("dialog");

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 140, clientY: 100 });
    // The browser resolves this click's target to the common ancestor (the
    // dialog root) since mousedown/mouseup targets differed.
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("replaces the image with a fallback message when it fails to load", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    fireEvent.error(screen.getByAltText("Your past try-on: Chunky Platform Loafer"));
    expect(screen.queryByAltText("Your past try-on: Chunky Platform Loafer")).not.toBeInTheDocument();
    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });

  it("zooms in on a two-pointer pinch-out gesture, bounded by the real distance ratio", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");

    // Baseline separation 20px, widened to 60px -> 3x ratio, clamped to MAX_ZOOM (3).
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 120, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 160, clientY: 100 });

    const zoom = Number((screen.getByRole("slider") as HTMLInputElement).value);
    expect(zoom).toBeGreaterThan(1);
    expect(zoom).toBeLessThanOrEqual(3);
  });

  it("zooms out on a two-pointer pinch-in gesture", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    const zoomBeforePinch = Number((screen.getByRole("slider") as HTMLInputElement).value);

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 120, clientY: 100 });

    const zoomAfterPinch = Number((screen.getByRole("slider") as HTMLInputElement).value);
    expect(zoomAfterPinch).toBeLessThan(zoomBeforePinch);
  });

  it("clamps a pinch collapse at the minimum zoom", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 101, clientY: 100 });

    expect(screen.getByRole("slider")).toHaveValue("1");
  });

  it("pans the zoomed image on a single-pointer drag", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 130 });

    const image = screen.getByAltText("Your past try-on: Chunky Platform Loafer");
    expect(image.style.transform).toContain("translate(60px, 30px)");
  });

  it("does not pan while at the default 1x zoom", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 130 });

    const image = screen.getByAltText("Your past try-on: Chunky Platform Loafer");
    expect(image.style.transform).toContain("translate(0px, 0px)");
  });

  it("resets pan once zoom returns to 1x", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const stage = screen.getByTestId("vto-viewer-stage");
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 130 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 160, clientY: 130 });

    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));

    const image = screen.getByAltText("Your past try-on: Chunky Platform Loafer");
    expect(image.style.transform).toContain("translate(0px, 0px)");
  });

  it("moves focus onto the close control on open", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("traps Tab within the dialog, wrapping from the last control back to Close", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    const zoomInButton = screen.getByRole("button", { name: "Zoom in" });
    zoomInButton.focus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("traps Shift+Tab within the dialog, wrapping from Close back to the last control", () => {
    render(<VtoResultViewer item={item} onClose={jest.fn()} />);
    screen.getByRole("button", { name: "Close" }).focus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(screen.getByRole("button", { name: "Zoom in" })).toHaveFocus();
  });
});
