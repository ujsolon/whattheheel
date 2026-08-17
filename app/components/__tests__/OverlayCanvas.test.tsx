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

        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
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
    expect(screen.getByText("Choose an image file your browser can display.")).toBeInTheDocument();
    choose(new File(["text"], "notes.txt", { type: "text/plain" }));
    expect(createObjectURL).not.toHaveBeenCalled();
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

    fireEvent.keyDown(screen.getByLabelText(/Scale:/), { key: "+" });
    expect(screen.getByLabelText("Scale: 1.05")).toHaveValue("1.05");
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
