import { NextResponse } from "next/server";

import { DuplicateEmailError } from "@/lib/data/users";
import { InvalidCredentialsInputError, registerUser } from "@/lib/services/auth";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
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

  try {
    const user = await registerUser(email, password);
    return NextResponse.json({ data: { id: user.id, email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidCredentialsInputError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }

    if (error instanceof DuplicateEmailError) {
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

    throw error;
  }
}
