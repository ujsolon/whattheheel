import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { VtoStylist } from "@/app/components/VtoStylist";

const trend = { id: "chunky-platform-loafer", label: "Chunky Platform Loafer", shoeImageUrl: "/trends/chunky-platform-loafer.png", buyUrl: null };
const otherTrend = { id: "burgundy-western-boot", label: "Burgundy Western Boot", shoeImageUrl: "/trends/burgundy-western-boot.png", buyUrl: null };

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("VtoStylist", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders a compact in-surface trend picker and applies selection without navigation", () => {
    render(<VtoStylist initialTrend={undefined} initialGender="female" trends={[trend, otherTrend]} />);

    const choice = screen.getByRole("button", { name: "Chunky Platform Loafer" });
    expect(choice).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /try it on/i })).not.toBeInTheDocument();

    fireEvent.click(choice);
    expect(choice).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
  });

  it("shows the pre-selected trend and a trigger button when a trend is carried over", () => {
    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);

    expect(screen.getByText("Chunky Platform Loafer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
  });

  it("shows a one-time gender selector when no gender is set yet, and omits it otherwise", () => {
    const { unmount } = render(<VtoStylist initialTrend={trend} initialGender={null} trends={[trend]} />);
    expect(screen.getByRole("radio", { name: /feminine/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /masculine/i })).toBeInTheDocument();
    unmount();

    // A different initialGender only ever occurs via a fresh mount (a full
    // page load) in real usage, never a prop change on a live instance.
    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    expect(screen.queryByRole("radio", { name: /feminine/i })).not.toBeInTheDocument();
  });

  it("disables the trigger until a gender is chosen when none is set on the profile", () => {
    render(<VtoStylist initialTrend={trend} initialGender={null} trends={[trend]} />);
    expect(screen.getByRole("button", { name: /try it on/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /feminine/i }));
    expect(screen.getByRole("button", { name: /try it on/i })).toBeEnabled();
  });

  it("triggers a task, shows the progress bar, and disables re-triggering while pending", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
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

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
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

  it("transitions to the generic error message on an error status", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "error", errorCode: "error_no_face" } }),
    );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(2000));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try another photo|retry/i })).toBeInTheDocument();
  });

  it("shows long-wait feedback at 30s and the lost-connection treatment at the 90s ceiling", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(30_000));
    expect(screen.getByText("Still working — hang tight.")).toBeInTheDocument();

    await act(async () => jest.advanceTimersByTimeAsync(60_000));

    expect(await screen.findByRole("alert")).toHaveTextContent("We lost the connection — tap to retry.");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("retry resets to idle, ready to trigger again", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "error", errorCode: "error_no_face" } }),
    );

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await act(async () => jest.advanceTimersByTimeAsync(2000));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /try another photo|retry/i }));

    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops after four consecutive poll failures and retries the same task without another POST", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }))
      .mockResolvedValue(jsonResponse({}, false));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
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

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(global.fetch).toHaveBeenCalledTimes(2);

    await act(async () => resolvePoll(jsonResponse({ data: { taskId: "task-1", status: "pending" } })));
  });
});
