import { randomUUID } from "node:crypto";
import { getTrendById } from "@/lib/data/trends";
import { findProfile, setGenderPreference } from "@/lib/data/userProfiles";
import { createTask, findSuccessfulTasksByUser, findTaskById, updateTaskStatus, type VtoTaskDocument } from "@/lib/data/vtoTasks";
import { getPrivateSelfieUrl, uploadVtoResult } from "@/lib/external/cloudinary";
import { createShoesTask, downloadResultImage, getTaskStatus } from "@/lib/external/youcam";
import { requireAuthenticatedUser } from "@/lib/services/auth";

// This module pulls in Mongo, Cloudinary, and the YouCam client — never let a
// non-type import from a Client Component (e.g. VtoHistoryGrid.tsx) bundle it.
if (typeof window !== "undefined") {
  throw new Error("lib/services/vtoTask.ts must not be imported into client-side code.");
}

// AC1: `epics.md` resolved "no style picker" — every task uses this single
// fixed default; the client never sees or sends it.
const STYLE = "random";

// Confirmed live: a real task took long enough in YouCam's queue that the
// default 300s signed URL (tuned for a browser viewing a profile page)
// expired before YouCam fetched it, producing a real `error_download_image`.
// 30 minutes gives real queue latency comfortable headroom.
const SELFIE_URL_LIFETIME_SECONDS = 1800;

// Same reasoning as SELFIE_URL_LIFETIME_SECONDS above: a result URL can be
// handed to a freshly rendered Profile page and reused later by the history
// viewer (Story 2.7, no re-fetch) without an intervening request, so it needs
// more headroom than the 300s default tuned for an immediate render.
const RESULT_URL_LIFETIME_SECONDS = 1800;

const RESULT_COPY_FAILED_CODE = "vto_result_copy_failed";

const ERROR_COPY: Record<string, string> = {
  error_no_face: "We couldn't detect a face — try a front-facing selfie with good lighting.",
  error_download_image: "We couldn't load one of the images — please try uploading again.",
  error_inference: "Something went wrong generating your preview — please try again.",
  error_nsfw_content_detected: "This image can't be used — please choose a different photo.",
  exceed_max_filesize: "That image is too large (max 10MB) — please choose a smaller file.",
};

export class NoSelfieError extends Error {
  constructor() {
    super("Upload a selfie before trying on a look.");
    this.name = "NoSelfieError";
  }
}

export class GenderPreferenceRequiredError extends Error {
  constructor() {
    super("Choose a gender preference to continue.");
    this.name = "GenderPreferenceRequiredError";
  }
}

export class TrendNotFoundError extends Error {
  constructor() {
    super("That trend could not be found.");
    this.name = "TrendNotFoundError";
  }
}

export class TaskNotFoundError extends Error {
  constructor() {
    super("That try-on session could not be found.");
    this.name = "TaskNotFoundError";
  }
}

export interface VtoTaskView {
  taskId: string;
  status: "pending" | "success" | "error";
  resultUrl?: string;
  message?: string;
}

export async function createVtoTask(
  trendId: string,
  origin: string,
  genderChoice?: string,
): Promise<{ taskId: string; status: "pending" }> {
  const user = await requireAuthenticatedUser();

  const profile = await findProfile(user.id);
  if (!profile) throw new NoSelfieError();

  const trend = getTrendById(trendId);
  if (!trend) throw new TrendNotFoundError();

  if (genderChoice !== undefined && genderChoice !== "female" && genderChoice !== "male") {
    throw new GenderPreferenceRequiredError();
  }

  let gender = profile.gender;
  if (!gender) {
    if (!genderChoice) throw new GenderPreferenceRequiredError();
    gender = genderChoice;
    await setGenderPreference(user.id, genderChoice);
  }

  // A fresh signature every call — `profile.selfieUrl` is a private
  // Cloudinary asset, never directly fetchable by YouCam.
  const srcUrl = getPrivateSelfieUrl(profile.selfiePublicId, profile.format, Date.now(), SELFIE_URL_LIFETIME_SECONDS);
  const refUrl = new URL(trend.shoeImageUrl, origin).toString();

  const { taskId } = await createShoesTask({ srcUrl, refUrl, gender, style: STYLE });

  const now = new Date();
  await createTask({
    taskId,
    userId: user.id,
    trendId: trend.id,
    status: "pending",
    // Store the non-credential private asset URL, not the temporary signed URL
    // that grants YouCam time-bounded access to the selfie.
    srcUrl: profile.selfieUrl,
    refUrl,
    style: STYLE,
    gender,
    createdAt: now,
    updatedAt: now,
  });

  return { taskId, status: "pending" };
}

export async function getVtoTaskStatus(taskId: string): Promise<VtoTaskView> {
  const user = await requireAuthenticatedUser();

  const task = await findTaskById(taskId);
  // AD-3: identical outcome for "doesn't exist" and "not yours" — never 403.
  if (!task || task.userId !== user.id) throw new TaskNotFoundError();

  if (task.status !== "pending") {
    return toView(task);
  }

  const result = await getTaskStatus(taskId);

  if (result.status === "pending") {
    return toView(task);
  }

  if (result.status === "success") {
    // AD-8: YouCam retains results for only ~24h, so copy to durable storage
    // the moment success is observed — never store/serve the raw YouCam URL.
    // A download/upload failure here must not strand the task at `pending`
    // forever (Review Finding, Story 2.6): fall through to the same
    // error-terminal path as a real YouCam error, using an app-internal code
    // that isn't in ERROR_COPY, so it resolves to the generic fallback copy
    // and the user gets the existing "try another photo" retry.
    let uploaded: { publicId: string; format: string } | undefined;
    try {
      const buffer = await downloadResultImage(result.resultUrl);
      const upload = await uploadVtoResult(buffer);
      if (upload.format) uploaded = { publicId: upload.publicId, format: upload.format };
    } catch {
      uploaded = undefined;
    }

    if (!uploaded) {
      const updated = await updateTaskStatus(taskId, { status: "error", errorCode: RESULT_COPY_FAILED_CODE });
      if (updated) return { taskId, status: "error", message: resolveErrorMessage(RESULT_COPY_FAILED_CODE) };
      return reconcileAfterLostRace(taskId, user.id);
    }

    const updated = await updateTaskStatus(taskId, {
      status: "success",
      resultPublicId: uploaded.publicId,
      resultFormat: uploaded.format,
    });
    if (updated) {
      return {
        taskId,
        status: "success",
        resultUrl: getPrivateSelfieUrl(uploaded.publicId, uploaded.format, Date.now(), RESULT_URL_LIFETIME_SECONDS),
      };
    }
    return reconcileAfterLostRace(taskId, user.id);
  }

  const updated = await updateTaskStatus(taskId, { status: "error", errorCode: result.errorCode });
  if (result.errorCode === "invalid_parameter") {
    console.error("vto_invalid_parameter", { correlationId: randomUUID(), taskId });
  }
  if (updated) return { taskId, status: "error", message: resolveErrorMessage(result.errorCode) };
  return reconcileAfterLostRace(taskId, user.id);
}

async function reconcileAfterLostRace(taskId: string, userId: string): Promise<VtoTaskView> {
  const authoritative = await findTaskById(taskId);
  if (!authoritative || authoritative.userId !== userId) throw new TaskNotFoundError();
  return toView(authoritative);
}

function toView(task: VtoTaskDocument): VtoTaskView {
  if (task.status === "error") {
    return { taskId: task.taskId, status: "error", message: resolveErrorMessage(task.errorCode) };
  }
  const resultUrl =
    task.status === "success" && task.resultPublicId && task.resultFormat
      ? getPrivateSelfieUrl(task.resultPublicId, task.resultFormat, Date.now(), RESULT_URL_LIFETIME_SECONDS)
      : undefined;
  return { taskId: task.taskId, status: task.status, resultUrl };
}

function resolveErrorMessage(errorCode?: string): string {
  return (errorCode && ERROR_COPY[errorCode]) ?? ERROR_COPY.error_inference;
}

export interface VtoHistoryItem {
  taskId: string;
  trendLabel: string;
  resultUrl: string;
  createdAt: string;
}

export async function getVtoHistory(): Promise<VtoHistoryItem[]> {
  const user = await requireAuthenticatedUser();
  const tasks = await findSuccessfulTasksByUser(user.id);

  const items: VtoHistoryItem[] = [];
  for (const task of tasks) {
    if (!task.trendId || !task.resultPublicId || !task.resultFormat) continue;
    if (!(task.createdAt instanceof Date) || Number.isNaN(task.createdAt.getTime())) continue;
    const trend = getTrendById(task.trendId);
    if (!trend) continue;
    items.push({
      taskId: task.taskId,
      trendLabel: trend.label,
      resultUrl: getPrivateSelfieUrl(task.resultPublicId, task.resultFormat, Date.now(), RESULT_URL_LIFETIME_SECONDS),
      createdAt: task.createdAt.toISOString(),
    });
  }
  return items;
}
