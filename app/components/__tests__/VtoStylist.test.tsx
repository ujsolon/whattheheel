import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { VtoStylist } from "@/app/components/VtoStylist";

const trend = { id: "chunky-platform-loafer", label: "Chunky Platform Loafer", shoeImageUrl: "/trends/chunky-platform-loafer.png", buyUrl: null };
const otherTrend = { id: "burgundy-western-boot", label: "Burgundy Western Boot", shoeImageUrl: "/trends/burgundy-western-boot.png", buyUrl: null };
const retailTrend = { ...trend, buyUrl: "https://retailer.example/products/chunky-platform-loafer" };
const profile = { email: "a@b.com", selfieUrl: "https://example.test/selfie.jpg", updatedAt: "2026-08-18T00:00:00.000Z" };

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("VtoStylist", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => "blob:preview");
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders a compact in-surface trend picker and applies selection without navigation", () => {
    render(<VtoStylist initialTrend={undefined} initialGender="female" trends={[trend, otherTrend]} initialProfile={profile} />);

    const choice = screen.getByRole("button", { name: "Chunky Platform Loafer" });
    expect(choice).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /try it on/i })).not.toBeInTheDocument();

    fireEvent.click(choice);
    expect(choice).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
  });

  it("shows the pre-selected trend and a trigger button when a trend is carried over", () => {
    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);

    expect(screen.getByText("Chunky Platform Loafer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
  });

  it("shows a one-time gender selector when no gender is set yet, and omits it otherwise", () => {
    const { unmount } = render(<VtoStylist initialTrend={trend} initialGender={null} trends={[trend]} initialProfile={profile} />);
    expect(screen.getByRole("radio", { name: /feminine/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /masculine/i })).toBeInTheDocument();
    unmount();

    // A different initialGender only ever occurs via a fresh mount (a full
    // page load) in real usage, never a prop change on a live instance.
    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    expect(screen.queryByRole("radio", { name: /feminine/i })).not.toBeInTheDocument();
  });

  it("disables the trigger until a gender is chosen when none is set on the profile", () => {
    render(<VtoStylist initialTrend={trend} initialGender={null} trends={[trend]} initialProfile={profile} />);
    expect(screen.getByRole("button", { name: /try it on/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /feminine/i }));
    expect(screen.getByRole("button", { name: /try it on/i })).toBeEnabled();
  });

  it("triggers a task, shows the progress bar, and disables re-triggering while pending", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      "/api/vto-tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ trendId: "chunky-platform-loafer", gender: "female" }),
      }),
    ));

    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try it on/i })).not.toBeInTheDocument();
  });

  it("polls on a fixed interval and transitions to the result image on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
    );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(2000));

    await waitFor(() =>
      expect(screen.getByRole("img", { name: /your ai try-on result/i })).toHaveAttribute(
        "src",
        "https://cdn.test/result.jpg",
      ),
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows the selected trend's Buy Now link only after a successful result", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValue(
        jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
      );

    render(<VtoStylist initialTrend={retailTrend} initialGender="female" trends={[retailTrend]} initialProfile={profile} />);
    expect(screen.queryByRole("link", { name: "Heel Yes — Buy Now →" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    const link = await screen.findByRole("link", { name: "Heel Yes — Buy Now →" });

    expect(link).toHaveAttribute("href", retailTrend.buyUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
    expect(link).toHaveClass("min-h-11", "w-full", "bg-lime", "border-[3px]", "shadow-[5px_5px_0_var(--color-pink)]");
  });

  it("hides Buy Now after success when the selected trend has no retail URL", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValue(
        jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
      );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("img", { name: /your ai try-on result/i });

    expect(screen.queryByRole("link", { name: /buy now/i })).not.toBeInTheDocument();
  });

  it("uses the retail URL from a trend selected inside the Stylist surface", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValue(
        jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
      );

    render(<VtoStylist initialTrend={undefined} initialGender="female" trends={[retailTrend, otherTrend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: retailTrend.label }));
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));

    expect(await screen.findByRole("link", { name: "Heel Yes — Buy Now →" })).toHaveAttribute(
      "href",
      retailTrend.buyUrl,
    );
  });

  it("keeps Buy Now hidden throughout a photo error and inline re-upload", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { status: "error", fault: "photo", message: "Choose another photo." } }),
      );

    render(<VtoStylist initialTrend={retailTrend} initialGender="female" trends={[retailTrend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));

    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: /buy now/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));
    expect(screen.getByLabelText("Add/change photo")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /buy now/i })).not.toBeInTheDocument();
  });

  it("falls back to the generic copy when the server sends an error with no resolved message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "error" } }),
    );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(2000));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong generating your preview — please try again.",
    );
  });

  it.each([
    ["an empty-string message", ""],
    ["a non-string message", { nested: "object" }],
  ])("ignores %s and renders the generic copy rather than a blank or broken alert", async (_label, message) => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "error", message } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong generating your preview — please try again.",
    );
  });

  it("renders the exact server-resolved copy for a photo-fault error and offers re-upload as the primary action", async () => {
    const lockedCopy = "We couldn't detect a face — try a front-facing selfie with good lighting.";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { taskId: "task-1", status: "error", message: lockedCopy, fault: "photo" } }),
      );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(lockedCopy);
    expect(screen.getByRole("button", { name: "Try another photo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  // The core of the fault split: a system-fault failure must never make
  // replacing the selfie the only way forward, since the photo wasn't at fault
  // and a fresh task costs another billable YouCam unit.
  it("offers a plain retry (not a forced re-upload) for a system-fault error, returning straight to the trigger", async () => {
    const genericCopy = "Something went wrong generating your preview — please try again.";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { taskId: "task-1", status: "error", message: genericCopy, fault: "system" } }),
      );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("alert");

    const primary = screen.getByRole("button", { name: "Try again" });
    // Re-upload stays available as a secondary choice, just not the only one.
    expect(screen.getByRole("button", { name: "Try another photo" })).toBeInTheDocument();

    fireEvent.click(primary);

    expect(screen.getByRole("button", { name: /try it on/i })).toBeEnabled();
    expect(screen.queryByLabelText("Add/change photo")).not.toBeInTheDocument();
  });

  it("lets the user leave the re-upload phase without saving, so a failing upload is not a dead end", async () => {
    const lockedCopy = "We couldn't detect a face — try a front-facing selfie with good lighting.";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { taskId: "task-1", status: "error", message: lockedCopy, fault: "photo" } }),
      );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));
    expect(screen.getByLabelText("Add/change photo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep my current photo" }));

    expect(screen.getByRole("button", { name: /try it on/i })).toBeEnabled();
    expect(screen.queryByLabelText("Add/change photo")).not.toBeInTheDocument();
  });

  it("reopens the selfie uploader inline and preserves trend and gender after a successful save", async () => {
    const lockedCopy = "We couldn't detect a face — try a front-facing selfie with good lighting.";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { taskId: "task-1", status: "error", message: lockedCopy, fault: "photo" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { profile: { ...profile, selfieUrl: "https://example.test/replacement.jpg" } } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-2", status: "pending" } }))
      .mockResolvedValue(jsonResponse({ data: { taskId: "task-2", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender={null} trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("radio", { name: "Feminine" }));
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));

    const picker = screen.getByLabelText("Add/change photo");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.change(picker, { target: { files: [new File(["photo"], "replacement.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save selfie" }));

    expect(await screen.findByRole("button", { name: /try it on/i })).toBeEnabled();
    expect(screen.getByText("Chunky Platform Loafer")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Feminine" })).not.toBeInTheDocument();

    // AC5 proven by what actually goes on the wire, not by proxy: re-trigger
    // and assert the preserved gender is still what gets sent.
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/vto-tasks",
        expect.objectContaining({ body: JSON.stringify({ trendId: trend.id, gender: "female" }) }),
      ),
    );
  });

  it("seeds a second re-upload with the replacement selfie, not the one already superseded", async () => {
    const lockedCopy = "We couldn't detect a face — try a front-facing selfie with good lighting.";
    const errorBody = jsonResponse({
      data: { taskId: "task-1", status: "error", message: lockedCopy, fault: "photo" },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValueOnce(errorBody)
      .mockResolvedValueOnce(
        jsonResponse({ data: { profile: { ...profile, selfieUrl: "https://example.test/replacement.jpg" } } }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-2", status: "pending" } }))
      .mockResolvedValue(errorBody);

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));
    fireEvent.change(screen.getByLabelText("Add/change photo"), {
      target: { files: [new File(["photo"], "replacement.jpg", { type: "image/jpeg" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save selfie" }));
    await screen.findByRole("button", { name: /try it on/i });

    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));

    expect(screen.getByAltText("Your saved selfie")).toHaveAttribute(
      "src",
      "https://example.test/replacement.jpg",
    );
  });

  it("shows long-wait feedback at 30s and the lost-connection treatment at the 90s ceiling", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(30_000));
    expect(screen.getByText("Still working — hang tight.")).toBeInTheDocument();

    await act(async () => jest.advanceTimersByTimeAsync(60_000));

    expect(await screen.findByRole("alert")).toHaveTextContent("We lost the connection — tap to retry.");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    // A timeout is not the photo's fault: it re-polls the same task rather than
    // demanding a new upload (and a new billable task). AC4 was amended to match.
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try another photo" })).not.toBeInTheDocument();
  });

  it("a photo-fault error opens the inline selfie uploader", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({
        data: {
          taskId: "task-1",
          status: "error",
          message: "We couldn't detect a face — try a front-facing selfie with good lighting.",
          fault: "photo",
        },
      }),
    );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(2000));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Try another photo" }));

    expect(screen.getByLabelText("Add/change photo")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops after four consecutive poll failures and retries the same task without another POST", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValue(jsonResponse({}, false));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");
    await act(async () => jest.advanceTimersByTimeAsync(6000));

    expect(await screen.findByRole("alert")).toHaveTextContent("We lost the connection — tap to retry.");
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("img", { name: /your ai try-on result/i })).toBeInTheDocument();
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url === "/api/vto-tasks")).toHaveLength(1);
  });

  it("does not overlap polls while a status request is still in flight", async () => {
    let resolvePoll!: (response: Response) => void;
    const pendingPoll = new Promise<Response>((resolve) => {
      resolvePoll = resolve;
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockReturnValueOnce(pendingPoll);

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => resolvePoll(jsonResponse({ data: { taskId: "task-1", status: "pending" } })));
  });
});
