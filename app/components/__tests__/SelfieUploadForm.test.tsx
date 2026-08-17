import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SelfieUploadForm } from "@/app/components/SelfieUploadForm";

describe("SelfieUploadForm", () => {
  beforeEach(() => { global.URL.createObjectURL = jest.fn(() => "blob:preview"); global.URL.revokeObjectURL = jest.fn(); global.fetch = jest.fn(); });
  it("shows guidance and requires a file", () => { render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); expect(screen.getByText(/front-facing solo photo/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); expect(screen.getByRole("alert")).toHaveTextContent("Choose a selfie to upload."); });
  it("submits one selfie and renders success", async () => { (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: { profile: { email: "a@b.com", selfieUrl: "https://example.test/signed", updatedAt: new Date().toISOString() } } }) }); render(<SelfieUploadForm initialProfile={{ email: "a@b.com", selfieUrl: null, updatedAt: null }} />); const file = new File(["photo"], "selfie.jpg", { type: "image/jpeg" }); fireEvent.change(screen.getByLabelText("Add/change photo"), { target: { files: [file] } }); fireEvent.click(screen.getByRole("button", { name: "Save selfie" })); await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST" }))); expect(await screen.findByText("Selfie saved.")).toBeInTheDocument(); });
});
