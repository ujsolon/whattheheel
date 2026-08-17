import { NextResponse } from "next/server";

import {
  DuplicateRegistrationError,
  enforceRegistrationThrottle,
  InvalidCredentialsInputError,
  RegistrationRateLimitError,
  registerUser,
} from "@/lib/services/auth";

const MAX_BODY_BYTES = 16 * 1024;

class PayloadTooLargeError extends Error {}

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }

  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) throw new PayloadTooLargeError();
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const clientIdentity = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await enforceRegistrationThrottle(clientIdentity);
    const body = await readLimitedJson(request);
    const email =
      typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
        ? body.email
        : "";
    const password =
      typeof body === "object" &&
      body !== null &&
      "password" in body &&
      typeof body.password === "string"
        ? body.password
        : "";

    const user = await registerUser(email, password);
    return NextResponse.json({ data: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidCredentialsInputError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }

    if (error instanceof DuplicateRegistrationError) {
      return NextResponse.json(
        {
          error: {
            code: "duplicate_email",
            message: "That email's already registered — sign in instead?",
          },
        },
        { status: 409 },
      );
    }

    if (error instanceof RegistrationRateLimitError) {
      return NextResponse.json(
        { error: { code: "rate_limited", message: error.message } },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }

    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json(
        { error: { code: "payload_too_large", message: "Request body is too large." } },
        { status: 413 },
      );
    }

    throw error;
  }
}
