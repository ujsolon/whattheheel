import { UnauthorizedError } from "@/lib/services/auth";
import { getVtoTaskStatus, TaskNotFoundError } from "@/lib/services/vtoTask";
import { YouCamApiError } from "@/lib/external/youcam";

export const runtime = "nodejs";

function error(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const task = await getVtoTaskStatus(id);
    return Response.json({ data: task }, { status: 200 });
  } catch (cause) {
    if (cause instanceof UnauthorizedError) return error("unauthorized", "Sign in to check this try-on.", 401);
    if (cause instanceof TaskNotFoundError) return error("not_found", "That try-on session could not be found.", 404);
    if (cause instanceof YouCamApiError) return error(cause.code, cause.message, 502);
    console.error("vto_task_status_failed", {
      correlationId: crypto.randomUUID(),
      errorClass: cause instanceof Error ? cause.name : "UnknownError",
    });
    return error("vto_task_status_failed", "We couldn't check on your try-on — please try again.", 500);
  }
}
