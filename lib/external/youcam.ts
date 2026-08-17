const SHOES_TASK_PATH = "/s2s/v2.0/task/shoes";
const YOUCAM_TIMEOUT_MS = 15_000;

export class YouCamApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "YouCamApiError";
  }
}

function getApiKey(): string {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("YOUCAM_API_KEY environment variable is not set.");
  return key;
}

function getBaseUrl(): string {
  const base = process.env.YOUCAM_API_BASE_URL;
  if (!base) throw new Error("YOUCAM_API_BASE_URL environment variable is not set.");
  return base;
}

interface RawErrorBody {
  error?: { code?: string; message?: string };
}

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(YOUCAM_TIMEOUT_MS) });
  } catch {
    throw new YouCamApiError("youcam_network_error", "Could not reach the YouCam API.");
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = (body ?? {}) as RawErrorBody;
    throw new YouCamApiError(
      errorBody.error?.code ?? "youcam_api_error",
      errorBody.error?.message ?? `YouCam API responded with status ${response.status}.`,
    );
  }

  return body;
}

export interface CreateShoesTaskInput {
  srcUrl: string;
  refUrl: string;
  gender: "female" | "male";
  style: string;
}

export interface CreateShoesTaskResult {
  taskId: string;
}

export async function createShoesTask(input: CreateShoesTaskInput): Promise<CreateShoesTaskResult> {
  const body = await requestJson(`${getBaseUrl()}${SHOES_TASK_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      src_file_url: input.srcUrl,
      ref_file_url: input.refUrl,
      gender: input.gender,
      style: input.style,
    }),
  });

  const taskId = (body as { data?: { task_id?: string } })?.data?.task_id;
  if (!taskId) {
    throw new YouCamApiError("youcam_unexpected_response", "YouCam did not return a task id.");
  }

  return { taskId };
}

export type TaskStatusResult =
  | { status: "pending" }
  | { status: "success"; resultUrl: string }
  | { status: "error"; errorCode: string };

// YouCam's own status vocabulary is "running" | "success" | "error", carried
// in `data.task_status` (not `data.status`, which is the outer HTTP-status
// echo) — normalized to "pending" | "success" | "error" here so the rest of
// the app never sees their raw wording. Response shape confirmed live via
// Perfect Corp's own API playground:
// { status: 200, data: { error: null, results: { url: "..." }, task_status: "success" } }
export async function getTaskStatus(taskId: string): Promise<TaskStatusResult> {
  const body = (await requestJson(`${getBaseUrl()}${SHOES_TASK_PATH}/${taskId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })) as {
    data?: {
      task_status?: string;
      results?: { url?: string; output?: Array<{ url?: string }> };
      error?: string | { code?: string } | null;
    };
  };

  const data = body.data ?? {};

  if (data.task_status === "success") {
    const resultUrl = data.results?.url ?? data.results?.output?.[0]?.url;
    if (!resultUrl) {
      throw new YouCamApiError("youcam_unexpected_response", "YouCam reported success with no result URL.");
    }
    let parsedResultUrl: URL;
    try {
      parsedResultUrl = new URL(resultUrl);
    } catch {
      throw new YouCamApiError("youcam_unexpected_response", "YouCam returned an invalid result URL.");
    }
    if (parsedResultUrl.protocol !== "https:") {
      throw new YouCamApiError("youcam_unexpected_response", "YouCam returned an insecure result URL.");
    }
    return { status: "success", resultUrl: parsedResultUrl.toString() };
  }

  if (data.task_status === "error") {
    const errorCode = typeof data.error === "string" ? data.error : (data.error?.code ?? "error_inference");
    return { status: "error", errorCode };
  }

  if (data.task_status === "running") return { status: "pending" };

  throw new YouCamApiError("youcam_unexpected_response", "YouCam returned an unknown task status.");
}

// YouCam retains processed results for only ~24 hours (docs/ai-skin-analysis.md),
// so a durable history feature must fetch this once and copy it elsewhere
// immediately — see lib/services/vtoTask.ts's copy-on-success step (AD-8).
export async function downloadResultImage(url: string): Promise<Buffer> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(YOUCAM_TIMEOUT_MS) });
  } catch {
    throw new YouCamApiError("youcam_result_download_failed", "Could not download the try-on result image.");
  }

  if (!response.ok) {
    throw new YouCamApiError(
      "youcam_result_download_failed",
      `Downloading the try-on result image failed with status ${response.status}.`,
    );
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}
