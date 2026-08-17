import { UnauthorizedError } from "@/lib/services/auth";
import { ImageValidationError } from "@/lib/services/imageValidation";
import { ProfileConflictError, uploadMySelfie } from "@/lib/services/profile";

export const runtime = "nodejs";
const MAX_MULTIPART_BYTES = 10_100_000;
function error(code: string, message: string, status: number) { return Response.json({ error: { code, message } }, { status }); }

async function boundedFormData(request: Request): Promise<FormData> {
  if (!request.body) throw new Error("invalid_multipart");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_MULTIPART_BYTES) { await reader.cancel(); throw new Error("payload_too_large"); } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const headers = new Headers(); const contentType = request.headers.get("content-type"); if (contentType) headers.set("content-type", contentType);
  return new Request("http://local", { method: "POST", headers, body: bytes }).formData();
}

export async function POST(request: Request) {
  try {
    const form = await boundedFormData(request);
    const files = form.getAll("selfie");
    const unexpectedFiles = [...form.entries()].some(([key, value]) => value instanceof File && key !== "selfie");
    if (files.length === 0) return error("missing_file", "Choose a selfie to upload.", 400);
    if (files.length !== 1 || !(files[0] instanceof File) || unexpectedFiles) return error("invalid_multipart", "Upload exactly one selfie.", 400);
    const profile = await uploadMySelfie(files[0]);
    return Response.json({ data: { profile } });
  } catch (cause) {
    if (cause instanceof UnauthorizedError) return error("unauthorized", "Sign in to upload a selfie.", 401);
    if (cause instanceof ImageValidationError) return error(cause.code, cause.message, cause.code === "file_too_large" ? 413 : 400);
    if (cause instanceof ProfileConflictError) return error("profile_conflict", "Your profile changed. Please try again.", 409);
    if (cause instanceof Error && cause.message === "payload_too_large") return error("payload_too_large", "Upload payload is too large.", 413);
    if (cause instanceof Error && (cause.message === "invalid_multipart" || cause.name === "TypeError")) return error("invalid_multipart", "Upload a valid multipart form.", 400);
    console.error("selfie_upload_failed", { correlationId: crypto.randomUUID(), errorClass: cause instanceof Error ? cause.name : "UnknownError" });
    return error("selfie_storage_failed", "We couldn't save your selfie — please try again.", 500);
  }
}
