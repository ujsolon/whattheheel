import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { createUser, findUserByEmail, type User } from "@/lib/data/users";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;

export class InvalidCredentialsInputError extends Error {
  constructor(
    public readonly code: "invalid_email" | "invalid_password",
    message: string,
  ) {
    super(message);
    this.name = "InvalidCredentialsInputError";
  }
}

export const authOptions: AuthOptions = {
  // NextAuth v4: CredentialsProvider is incompatible with database-persisted
  // sessions, so this is not a stylistic choice — it's required (AD-7).
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await findUserByEmail(email);
        if (!user) {
          // Never distinguish "unknown email" from "wrong password" — both
          // paths return null identically (AC4: no account enumeration).
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return { id: user.id, email: user.email };
      },
    }),
  ],
};

export async function registerUser(email: string, password: string): Promise<User> {
  if (!EMAIL_PATTERN.test(email)) {
    throw new InvalidCredentialsInputError("invalid_email", "Enter a valid email address.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidCredentialsInputError(
      "invalid_password",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  return createUser(email, passwordHash);
}
