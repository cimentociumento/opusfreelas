import { createClerkClient } from "@clerk/backend";
import type { Context, Next } from "hono";

export type AuthUser = {
  userId: string;
  sessionId: string | null;
};

const authUserKey = "authUser";

function getAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES ?? "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required");
  }
  return createClerkClient({ secretKey });
}

export function getAuthUser(c: Context): AuthUser {
  const authUser = c.get(authUserKey) as AuthUser | undefined;
  if (!authUser) {
    throw new Error("Auth user is missing in request context");
  }
  return authUser;
}

export async function requireClerkAuth(c: Context, next: Next) {
  const authorization = c.req.header("authorization") ?? "";
  const [, token] = authorization.match(/^Bearer\s+(.+)$/i) ?? [];

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const clerk = getClerkClient();
  const requestState = await clerk.authenticateRequest(c.req.raw, {
    authorizedParties: getAuthorizedParties(),
    jwtKey: process.env.CLERK_JWT_KEY || undefined,
  });

  if (!requestState.isSignedIn || !requestState.toAuth().userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set(authUserKey, {
    userId: requestState.toAuth().userId,
    sessionId: requestState.toAuth().sessionId ?? null,
  } satisfies AuthUser);

  await next();
}