import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { consumeRegistrationAttempt } from "@/lib/data/registrationThrottle";
import {
  createUser,
  DuplicateEmailError,
  findUserByEmail,
  type User,
} from "@/lib/data/users";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;
const BCRYPT_SALT_ROUNDS = 10;
const DUMMY_PASSWORD_HASH = "$2b$10$C6UzMDM.H6dfI/f/IKcEe.9zDvM5Q3QjLJ6GzEwE6o.1B6QqZxC9K";

export class InvalidCredentialsInputError extends Error {
  constructor(
    public readonly code: "invalid_email" | "invalid_password",
    message: string,
  ) {
    super(message);
    this.name = "InvalidCredentialsInputError";
  }
}

export class DuplicateRegistrationError extends Error {
  constructor() {
    super("That email's already registered — sign in instead?");
    this.name = "DuplicateRegistrationError";
  }
}

export class RegistrationRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many registration attempts. Please wait and try again.");
    this.name = "RegistrationRateLimitError";
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

        try {
          const user = await findUserByEmail(email);
          const isValid = await bcrypt.compare(
            password,
            user?.passwordHash ?? DUMMY_PASSWORD_HASH,
          );

          if (!user || !isValid) {
            return null;
          }

          return { id: user.id, email: user.email };
        } catch (error) {
          console.error("Unable to authorize credentials", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) throw new UnauthorizedError();
  return { id: session.user.id, email: session.user.email };
}

export function safeCallbackUrl(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "http://local");
    return parsed.origin === "http://local" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export async function registerUser(email: string, password: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new InvalidCredentialsInputError("invalid_email", "Enter a valid email address.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidCredentialsInputError(
      "invalid_password",
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new InvalidCredentialsInputError(
      "invalid_password",
      "Password must be 72 bytes or fewer.",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  try {
    return await createUser(normalizedEmail, passwordHash);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      throw new DuplicateRegistrationError();
    }
    throw error;
  }
}

export async function enforceRegistrationThrottle(identity: string): Promise<void> {
  const key = createHash("sha256").update(identity).digest("hex");
  const result = await consumeRegistrationAttempt(key);
  if (!result.allowed) {
    throw new RegistrationRateLimitError(result.retryAfterSeconds);
  }
}
