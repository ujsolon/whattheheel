import { YouCamApiError } from "@/lib/external/youcam";
import { UnauthorizedError } from "@/lib/services/auth";
import {
  createVtoTask,
  GenderPreferenceRequiredError,
  NoSelfieError,
  TrendNotFoundError,
} from "@/lib/services/vtoTask";

export const runtime = "nodejs";

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const body: unknown = await request.json().catch(() => null);
  const trendId =
    typeof body === "object" && body !== null && "trendId" in body && typeof body.trendId === "string"
      ? body.trendId
      : "";
  const gender =
    typeof body === "object" && body !== null && "gender" in body && typeof body.gender === "string"
      ? (body.gender as "female" | "male")
      : undefined;

  if (!trendId) {
    return error("invalid_trend", "Choose a trend to try on.", 400);
  }

  try {
    const task = await createVtoTask(trendId, origin, gender);
    return Response.json({ data: task }, { status: 201 });
  } catch (cause) {
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
