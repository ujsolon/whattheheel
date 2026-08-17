import { getTrendById } from "@/lib/data/trends";
import { findProfile, setGenderPreference } from "@/lib/data/userProfiles";
import { createTask, findTaskById, updateTaskStatus, type VtoTaskDocument } from "@/lib/data/vtoTasks";
import { getPrivateSelfieUrl } from "@/lib/external/cloudinary";
import { createShoesTask, getTaskStatus } from "@/lib/external/youcam";
import { requireAuthenticatedUser } from "@/lib/services/auth";

// AC1: `epics.md` resolved "no style picker" — every task uses this single
// fixed default; the client never sends or sees it.
const STYLE = "random";

// Confirmed live: a real task took long enough in YouCam's queue that the
// default 300s signed URL (tuned for a browser viewing a profile page)
// expired before YouCam fetched it, producing a real `error_download_image`.
// 30 minutes gives real queue latency comfortable headroom.
const SELFIE_URL_LIFETIME_SECONDS = 1800;

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
  errorCode?: string;
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
    const updated = await updateTaskStatus(taskId, { status: "success", resultUrl: result.resultUrl });
    if (updated) return { taskId, status: "success", resultUrl: result.resultUrl };
    const authoritative = await findTaskById(taskId);
    if (!authoritative || authoritative.userId !== user.id) throw new TaskNotFoundError();
    return toView(authoritative);
  }

  const updated = await updateTaskStatus(taskId, { status: "error", errorCode: result.errorCode });
  if (updated) return { taskId, status: "error", errorCode: result.errorCode };
  const authoritative = await findTaskById(taskId);
  if (!authoritative || authoritative.userId !== user.id) throw new TaskNotFoundError();
  return toView(authoritative);
}

function toView(task: VtoTaskDocument): VtoTaskView {
  return { taskId: task.taskId, status: task.status, resultUrl: task.resultUrl, errorCode: task.errorCode };
}
