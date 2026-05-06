import { z } from "zod";
import type { Context } from "hono";
import { identityHandlers } from "./identity.js";
import { demandHandlers } from "./demands.js";
import { discoveryHandlers } from "./discovery.js";

const rpcRequestSchema = z.object({
  procedure: z.string(),
  input: z.unknown(),
});

const handlers = {
  ...identityHandlers,
  ...demandHandlers,
  ...discoveryHandlers,
};

export async function handleRpc(c: Context) {
  const parseResult = rpcRequestSchema.safeParse(await c.req.json());
  if (!parseResult.success) {
    return c.json({ error: "Invalid RPC envelope", details: parseResult.error.flatten() }, 400);
  }

  const { procedure, input } = parseResult.data;
  const handler = handlers[procedure as keyof typeof handlers];

  if (!handler) {
    return c.json({ error: "Unknown procedure", procedure }, 400);
  }

  return handler(c, input);
}