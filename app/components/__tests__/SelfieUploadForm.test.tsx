import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SelfieUploadForm } from "@/app/components/SelfieUploadForm";

describe("SelfieUploadForm", () => {
  beforeEach(() => { global.URL.createObjectURL = jest.fn(() => "blob:preview"); global.URL.revokeObjectURL = jest.fn(); global.fetch = jest.fn(); });
  it("shows guidance and requires a file", () => { render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); expect(screen.getByText(/front-facing solo photo/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); expect(screen.getByRole("alert")).toHaveTextContent("Choose a selfie to upload."); });
  it("submits one selfie and renders success", async () => { (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: { profile: { email: "a@b.com", selfieUrl: "https://example.test/signed", updatedAt: new Date().toISOString() } } }) }); render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); const file = new File(["photo"], "selfie.jpg", { type: "image/jpeg" }); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [file] } }); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST" }))); expect(await screen.findByText("Selfie saved.")).toBeInTheDocument(); });
  it("notifies its parent after a successful save when onSaved is supplied", async () => { const onSaved = jest.fn(); (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: { profile: { email: "a@b.com", selfieUrl: "https://example.test/signed", updatedAt: new Date().toISOString() } } }) }); render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} onSaved={onSaved} />); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File(["photo"], "selfie.jpg", { type: "image/jpeg" })] } }); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); await screen.findByText("Selfie saved."); expect(onSaved).toHaveBeenCalledTimes(1); });
  it("uses the narrowed picker and rejects HEIC before fetch", () => { render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); const input = screen.getByLabelText("Add/change photo"); expect(input).toHaveAttribute("accept", "image/jpeg,image/png"); fireEvent.change(input, { target: { files: [new File(["heic"], "selfie.heic", { type: "image/heic" })] } }); expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG or PNG image."); expect(global.fetch).not.toHaveBeenCalled(); });
  it("rejects the strict client size boundary as a hint", () => { render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File([new Uint8Array(10_000_000)], "large.png", { type: "image/png" })] } }); expect(screen.getByRole("alert")).toHaveTextContent("too large"); });
  it("shows server errors and restores the controls", async () => { (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: { message: "Use a JPG or PNG image." } }) }); render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File(["photo"], "selfie.jpg", { type: "image/jpeg" })] } }); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); expect(await screen.findByRole("alert")).toHaveTextContent("Use a JPG or PNG image."); expect(screen.getByRole("button", { name: "Save selfie" })).toBeEnabled(); });
  it("handles local preview creation failure inline", () => { global.URL.createObjectURL = jest.fn(() => { throw new Error("decode unavailable"); }); render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File(["photo"], "selfie.jpg", { type: "image/jpeg" })] } }); expect(screen.getByRole("alert")).toHaveTextContent("We couldn't read that image"); expect(global.fetch).not.toHaveBeenCalled(); });
  it("revokes the prior preview when a replacement is selected and on unmount", () => { const { unmount } = render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); const input = screen.getByLabelText("Add/change photo"); fireEvent.change(input, { target: { files: [new File(["one"], "one.jpg", { type: "image/jpeg" })] } }); fireEvent.change(input, { target: { files: [new File(["two"], "two.jpg", { type: "image/jpeg" })] } }); expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview"); unmount(); expect(URL.revokeObjectURL).toHaveBeenCalled(); });

  it("hands the saved profile to onSaved so a parent can reseed itself", async () => {
    const saved = { email: "a@b.com", selfieUrl: "https://example.test/replacement.jpg", updatedAt: "2026-08-18T00:00:00.000Z" };
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: { profile: saved } }) });
    const onSaved = jest.fn();
    render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File(["photo"], "selfie.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save selfie" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
  });

  it("does not report a failure when a throwing onSaved handler runs after a successful save", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: { profile: { email: "a@b.com", selfieUrl: "https://example.test/x.jpg", updatedAt: null } } }) });
    render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} onSaved={() => { throw new Error("parent blew up"); }} />);
    fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [new File(["photo"], "selfie.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Save selfie" }));
    expect(await screen.findByText("Selfie saved.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("selfie_saved_callback_failed", expect.objectContaining({ errorClass: "Error" }));
    consoleSpy.mockRestore();
  });
});
