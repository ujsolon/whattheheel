import { fireEvent, render, screen, waitFor } from "@testing-library/react";

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

  it("renders a trend picker reusing TrendCard when no trend is carried over", () => {
    render(<VtoStylist initialTrend={undefined} initialGender="female" trends={[trend, otherTrend]} />);

    expect(screen.getByRole("link", { name: "Chunky Platform Loafer" })).toHaveAttribute(
      "href",
      "/stylist?trend=chunky-platform-loafer",
    );
    expect(screen.getByRole("link", { name: "Burgundy Western Boot" })).toHaveAttribute(
      "href",
      "/stylist?trend=burgundy-western-boot",
    );
    expect(screen.queryByRole("button", { name: /try it on/i })).not.toBeInTheDocument();
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

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "success", resultUrl: "https://cdn.test/result.jpg" } }),
    );
    await jest.advanceTimersByTimeAsync(3000);

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

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "error", errorCode: "error_no_face" } }),
    );
    await jest.advanceTimersByTimeAsync(3000);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try another photo|retry/i })).toBeInTheDocument();
  });

  it("stops polling and shows the generic error after the 90s ceiling with no terminal status", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    await jest.advanceTimersByTimeAsync(90_000);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("retry resets to idle, ready to trigger again", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ data: { taskId: "task-1", status: "pending" } }));

    render(<VtoStylist initialTrend={trend} initialGender="female" trends={[trend]} />);
    fireEvent.click(screen.getByRole("button", { name: /try it on/i }));
    await screen.findByRole("progressbar");

    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse({ data: { taskId: "task-1", status: "error", errorCode: "error_no_face" } }),
    );
    await jest.advanceTimersByTimeAsync(3000);
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /try another photo|retry/i }));

    expect(screen.getByRole("button", { name: /try it on/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
