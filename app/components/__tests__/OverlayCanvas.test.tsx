import { act, fireEvent, render, screen } from "@testing-library/react";

import { OverlayCanvas } from "@/app/components/OverlayCanvas";

const trend = {
  id: "loafer",
  label: "Chunky Loafer",
  shoeImageUrl: "/trends/loafer.png",
  buyUrl: null,
};

interface Decoder {
  onload: null | (() => void);
  onerror: null | (() => void);
  src: string;
}

describe("OverlayCanvas", () => {
  const decoders: Decoder[] = [];
  const createObjectURL = jest.fn((file: File) => `blob:${file.name}:${decoders.length}`);
  const revokeObjectURL = jest.fn();
  const fetchSpy = jest.fn();

  beforeEach(() => {
    decoders.length = 0;
    jest.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    Object.defineProperty(window, "fetch", { configurable: true, value: fetchSpy });
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
    Object.defineProperty(window, "Image", {
      configurable: true,
      value: class {
        onload: null | (() => void) = null;
        onerror: null | (() => void) = null;
        private value = "";

        constructor() {
          decoders.push(this);
        }

        set src(value: string) {
          this.value = value;
        }

        get src() {
          return this.value;
        }
      },
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: jest.fn(() => true),
    });
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 400,
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function choose(file: File) {
    const input = screen.getByLabelText("Your foot photo") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    return input;
  }

  function loadPhoto(name = "foot.png") {
    choose(new File(["photo"], name, { type: "image/png" }));
    act(() => decoders.at(-1)?.onload?.());
  }

  it("renders an accessible empty stage without revealing the CTA", () => {
    render(<OverlayCanvas trend={trend} />);

    expect(screen.getByRole("group", { name: "Shoe overlay stage" })).toHaveTextContent(
      "Choose a foot photo",
    );
    expect(screen.queryByText(/Unlock the AI Stylist/)).not.toBeInTheDocument();
  });

  it("treats cancellation as a no-op and rejects empty or non-image files inline", () => {
    render(<OverlayCanvas trend={trend} />);
    const input = screen.getByLabelText("Your foot photo");

    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    choose(new File([], "empty.png", { type: "image/png" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an image file your browser can display.",
    );
    expect(screen.getByRole("alert")).toHaveClass("text-error");
    choose(new File(["text"], "notes.txt", { type: "text/plain" }));
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("handles object URL creation failures as an inline validation error", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    createObjectURL.mockImplementationOnce(() => {
      throw new Error("object URLs unavailable");
    });
    render(<OverlayCanvas trend={trend} />);

    choose(new File(["photo"], "foot.png", { type: "image/png" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an image file your browser can display.",
    );
    expect(decoders).toHaveLength(0);
    expect(consoleError).toHaveBeenCalled();
  });

  it("shows a decoded local photo, supports same-file selection, and never uses network or storage", () => {
    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");
    const xhrSpy = jest.spyOn(XMLHttpRequest.prototype, "open");
    render(<OverlayCanvas trend={trend} />);

    const input = choose(new File(["photo"], "foot.png", { type: "image/png" }));
    expect(input.value).toBe("");
    act(() => decoders[0].onload?.());
    expect(screen.getByRole("img", { name: "Your selected foot" })).toHaveAttribute(
      "src",
      "blob:foot.png:0",
    );
    expect(screen.getByRole("img", { name: "Your selected foot" })).toHaveAttribute(
      "draggable",
      "false",
    );

    choose(new File(["photo"], "foot.png", { type: "image/png" }));
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
  });

  it("rejects decode failures and prevents an older decode from replacing the latest photo", () => {
    render(<OverlayCanvas trend={trend} />);
    choose(new File(["old"], "old.png", { type: "image/png" }));
    choose(new File(["new"], "new.png", { type: "image/png" }));

    act(() => decoders[0].onload?.());
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:old.png:0");
    act(() => decoders[1].onerror?.());
    expect(screen.getByText("Choose an image file your browser can display.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Your selected foot" })).not.toBeInTheDocument();
  });

  it("revokes replaced and active object URLs", () => {
    const { unmount } = render(<OverlayCanvas trend={trend} />);
    loadPhoto("first.png");
    loadPhoto("second.png");

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first.png:0");
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second.png:1");
  });

  it("changes and clamps sliders/buttons, latches the CTA, and keeps it after Reset", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();

    fireEvent.change(screen.getByLabelText(/Scale:/), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/Rotation:/), { target: { value: "45" } });
    fireEvent.click(screen.getByRole("button", { name: "+15°" }));
    expect(screen.getByLabelText("Rotation: 45°")).toHaveValue("45");
    expect(screen.getByText(/Unlock the AI Stylist/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByLabelText("Scale: 1.00")).toHaveValue("1");
    expect(screen.getByLabelText("Rotation: 0°")).toHaveValue("0");
    expect(screen.getByText(/Unlock the AI Stylist/)).toBeInTheDocument();
  });

  it("supports keyboard transforms only on the focused stage", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    fireEvent.keyDown(stage, { key: "+" });
    fireEvent.keyDown(stage, { key: "]" });
    for (let index = 0; index < 30; index += 1) fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(screen.getByLabelText("Scale: 1.05")).toHaveValue("1.05");
    expect(screen.getByLabelText("Rotation: 15°")).toHaveValue("15");
    expect(screen.getByTestId("shoe-overlay")).toHaveStyle({ left: "95%" });

    fireEvent.keyDown(screen.getByRole("img", { name: "Your selected foot" }), { key: "+" });
    expect(screen.getByLabelText("Scale: 1.05")).toHaveValue("1.05");
  });

  it("accumulates keyboard updates dispatched in the same render batch", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    act(() => {
      stage.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
      stage.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    });

    expect(screen.getByTestId("shoe-overlay")).toHaveStyle({ left: "54%" });
  });

  it("leaves browser shortcuts alone when a transform key has a modifier", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });
    const shortcut = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      key: "+",
    });

    expect(stage.dispatchEvent(shortcut)).toBe(true);
    expect(screen.getByLabelText("Scale: 1.00")).toHaveValue("1");
  });

  it("supports pointer drag, cancellation, and two-pointer pinch", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 120 });
    expect(screen.getByText(/Unlock the AI Stylist/)).toBeInTheDocument();
    fireEvent.pointerCancel(stage, { pointerId: 1 });

    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 3, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 3, clientX: 300, clientY: 100 });
    expect(Number((screen.getByLabelText(/Scale:/) as HTMLInputElement).value)).toBeGreaterThan(1);
  });

  it("accumulates fast drag events and ignores non-primary mouse drags", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    fireEvent.pointerDown(stage, {
      button: 2,
      clientX: 100,
      clientY: 100,
      pointerId: 9,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(stage, { clientX: 180, clientY: 100, pointerId: 9 });
    expect(screen.getByTestId("shoe-overlay")).toHaveStyle({ left: "50%" });

    fireEvent.pointerDown(stage, { clientX: 100, clientY: 100, pointerId: 1 });
    act(() => {
      stage.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: 140,
          clientY: 100,
          pointerId: 1,
        }),
      );
      stage.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: 180,
          clientY: 100,
          pointerId: 1,
        }),
      );
    });
    expect(screen.getByTestId("shoe-overlay")).toHaveStyle({ left: "70%" });
  });

  it("recovers when a pinch starts with both pointers at the same position", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto();
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 3, clientX: 150, clientY: 100 });

    expect(Number((screen.getByLabelText(/Scale:/) as HTMLInputElement).value)).toBeGreaterThan(1);
  });

  it("caps the mobile stage and controls and removes the loaded-stage border", () => {
    render(<OverlayCanvas trend={trend} />);
    const stage = screen.getByRole("group", { name: "Shoe overlay stage" });

    expect(stage.parentElement).toHaveClass("max-w-[30rem]");
    expect(stage).toHaveClass("max-w-[30rem]", "border-[3px]");
    loadPhoto();
    expect(stage).not.toHaveClass("border-[3px]");
    expect(screen.getByLabelText("Your foot photo").parentElement).toHaveClass("max-w-[30rem]");
  });

  it("resets pose and CTA when a replacement photo decodes", () => {
    render(<OverlayCanvas trend={trend} />);
    loadPhoto("first.png");
    fireEvent.click(screen.getByRole("button", { name: "+15°" }));
    expect(screen.getByText(/Unlock the AI Stylist/)).toBeInTheDocument();

    loadPhoto("second.png");
    expect(screen.getByLabelText("Rotation: 0°")).toHaveValue("0");
    expect(screen.queryByText(/Unlock the AI Stylist/)).not.toBeInTheDocument();
  });
});
