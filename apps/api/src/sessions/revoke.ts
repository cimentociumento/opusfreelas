import { createClerkClient } from "@clerk/backend";
import { z } from "zod";

type RevokeOthersInput = {
  userId: string;
  keepSessionId?: string | null;
};

const revokeInputSchema = z.object({
  keepSessionId: z.string().optional().nullable(),
});

export async function revokeOtherSessions(input: RevokeOthersInput) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is required");
  }

  const clerk = createClerkClient({ secretKey });
  const sessions = await clerk.sessions.getSessionList({ userId: input.userId, limit: 100 });

  const targets = sessions.data.filter((session) => session.id !== input.keepSessionId);

  await Promise.all(targets.map((session) => clerk.sessions.revokeSession(session.id)));

  return {
    revokedCount: targets.length,
    revokedSessionIds: targets.map((session) => session.id),
  };
}

export async function handleRevokeOthersRoute(userId: string, body: unknown, currentSessionId?: string | null) {
  const parsed = revokeInputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400 as const,
      payload: { error: "Invalid input", details: parsed.error.flatten() },
    };
  }

  const result = await revokeOtherSessions({
    userId,
    keepSessionId: parsed.data.keepSessionId ?? currentSessionId ?? null,
  });

  return {
    status: 200 as const,
    payload: result,
  };
}