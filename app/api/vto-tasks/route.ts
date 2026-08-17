import { YouCamApiError } from "@/lib/external/youcam";
import { UnauthorizedError } from "@/lib/services/auth";
import {
  createVtoTask,
  GenderPreferenceRequiredError,
  NoSelfieError,
  TrendNotFoundError,
} from "@/lib/services/vtoTask";

export const runtime = "nodejs";

const MAX_JSON_BODY_BYTES = 16_384;

class RequestBodyTooLargeError extends Error {}

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_JSON_BODY_BYTES) {
    throw new RequestBodyTooLargeError();
  }

  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_JSON_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function trustedAppOrigin(request: Request): string {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return new URL(configured).origin;

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return new URL(`https://${vercelHost}`).origin;

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    return new URL(request.url).origin;
  }
  throw new Error("A trusted application origin is not configured.");
}

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  try {
    const origin = trustedAppOrigin(request);
    const body = await readBoundedJson(request);
    const trendId =
      typeof body === "object" && body !== null && "trendId" in body && typeof body.trendId === "string"
        ? body.trendId
        : "";
    const rawGender = typeof body === "object" && body !== null && "gender" in body ? body.gender : undefined;

    if (!trendId) return error("invalid_trend", "Choose a trend to try on.", 400);
    if (rawGender !== undefined && rawGender !== "female" && rawGender !== "male") {
      return error("invalid_gender", "Choose a valid gender preference.", 400);
    }

    const gender = rawGender === "female" || rawGender === "male" ? rawGender : undefined;
    const task = await createVtoTask(trendId, origin, gender);
    return Response.json({ data: task }, { status: 201 });
  } catch (cause) {
    if (cause instanceof RequestBodyTooLargeError) {
      return error("payload_too_large", "The request body is too large.", 413);
    }
    if (cause instanceof UnauthorizedError) return error("unauthorized", "Sign in to try this on.", 401);
    if (cause instanceof NoSelfieError) return error("no_selfie", cause.message, 409);
    if (cause instanceof GenderPreferenceRequiredError) return error("gender_required", cause.message, 400);
    if (cause instanceof TrendNotFoundError) return error("trend_not_found", cause.message, 400);
    if (cause instanceof YouCamApiError) return error(cause.code, cause.message, 502);
    console.error("vto_task_create_failed", {
      correlationId: crypto.randomUUID(),
      errorClass: cause instanceof Error ? cause.name : "UnknownError",
    });
    return error("vto_task_failed", "We couldn't start your try-on — please try again.", 500);
  }
}
