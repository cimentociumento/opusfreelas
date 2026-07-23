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

  // ── Dev bypass ─────────────────────────────────────────────────────────
  const devToken = process.env.DEV_BYPASS_TOKEN;
  if (devToken && token === devToken) {
    // Bloqueia em produção mesmo que alguém defina a variável por engano
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set(authUserKey, {
      userId: process.env.DEV_BYPASS_USER_ID ?? "dev-user-local",
      sessionId: "dev-session",
    } satisfies AuthUser);
    await next();
    return;
  }
  // ───────────────────────────────────────────────────────────────────────

  let clerk: ReturnType<typeof getClerkClient>;
  try {
    clerk = getClerkClient();
  } catch (error) {
    console.error("[clerk.requireClerkAuth] Configuração ausente:", error);
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  const authorizedParties = getAuthorizedParties();
  let requestState: Awaited<ReturnType<typeof clerk.authenticateRequest>>;
  try {
    requestState = await clerk.authenticateRequest(c.req.raw, {
      ...(authorizedParties.length > 0 ? { authorizedParties } : {}),
      jwtKey: process.env.CLERK_JWT_KEY || undefined,
    });
  } catch (error) {
    // Token inválido/expirado/malformado não é um erro de servidor — 401, não 500.
    console.error("[clerk.requireClerkAuth] Token rejeitado:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!requestState.isSignedIn || !requestState.toAuth().userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set(authUserKey, {
    userId: requestState.toAuth().userId,
    sessionId: requestState.toAuth().sessionId ?? null,
  } satisfies AuthUser);

  await next();
}