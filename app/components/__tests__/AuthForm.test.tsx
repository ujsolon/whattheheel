import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthForm } from "@/app/components/AuthForm";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = jest.fn();
jest.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("AuthForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("starts in Sign Up mode with associated, properly typed inputs", () => {
    render(<AuthForm />);

    expect(screen.getByRole("form", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toHaveClass("focus-visible:outline-3");
    expect(screen.getByRole("button", { name: /already have an account/i })).toHaveClass(
      "focus-visible:outline-3",
    );
  });

  it("toggles to Sign In mode and back", () => {
    render(<AuthForm />);

    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));

    expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /need an account/i }));

    expect(screen.getByRole("form", { name: "Sign up" })).toBeInTheDocument();
  });

  it("disables submit and shows in-progress copy while a Sign Up request is pending", async () => {
    let resolveFetch!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<AuthForm />);
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(await screen.findByRole("button", { name: "Creating your account…" })).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ data: { id: "1", email: "jordan@example.com" } }) });
    mockSignIn.mockResolvedValue({ error: null, ok: true });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it("shows the locked duplicate-email copy on a 409 response, without signing in", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: { code: "duplicate_email", message: "That email's already registered — sign in instead?" },
      }),
    });

    render(<AuthForm />);
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(
      await screen.findByText("That email's already registered — sign in instead?"),
    ).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("signs in immediately after a successful Sign Up, then redirects home", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "1", email: "jordan@example.com" } }),
    });
    mockSignIn.mockResolvedValue({ error: null, ok: true });

    render(<AuthForm />);
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        redirect: false,
        email: "jordan@example.com",
        password: "longenough1",
      }),
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
  });

  it("shows the locked mismatch copy on a failed Sign In, without calling the register endpoint", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin", ok: false });

    render(<AuthForm />);
    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    fillForm("jordan@example.com", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Email or password didn't match — try again.")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows in-progress copy for Sign In distinct from Sign Up", async () => {
    let resolveSignIn!: (value: unknown) => void;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    render(<AuthForm />);
    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("button", { name: "Signing you in…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /need an account/i })).toBeDisabled();

    resolveSignIn({ error: null, ok: true });
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
  });

  it.each(["sign-up", "sign-in"])("shows a generic inline error when %s rejects", async (mode) => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    if (mode === "sign-up") {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("offline"));
    } else {
      mockSignIn.mockRejectedValue(new Error("offline"));
    }

    render(<AuthForm />);
    if (mode === "sign-in") {
      fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    }
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: mode === "sign-up" ? "Sign Up" : "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(consoleError).toHaveBeenCalledWith("Authentication submission failed", expect.any(Error));
    consoleError.mockRestore();
  });

  it("does not redirect when signIn reports ok false without an error string", async () => {
    mockSignIn.mockResolvedValue({ error: null, ok: false });
    render(<AuthForm />);
    fireEvent.click(screen.getByRole("button", { name: /already have an account/i }));
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password didn't match — try again.",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("switches to Sign In when account creation succeeds but immediate sign-in fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin", ok: false });
    render(<AuthForm />);
    fillForm("jordan@example.com", "longenough1");
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(await screen.findByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your account was created, but we couldn't sign you in. Please sign in now.",
    );
  });
});
