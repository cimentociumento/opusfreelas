import "dotenv/config.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireClerkAuth, getAuthUser } from "./middleware/clerk.js";
import { handleRpc } from "./rpc/router.js";
import { handleRevokeOthersRoute } from "./sessions/revoke.js";
import { initObservability } from "./observability.js";

export const app = new Hono();

initObservability(app);

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/rpc", requireClerkAuth, async (c) => {
  return handleRpc(c);
});

app.post("/sessions/revoke-others", requireClerkAuth, async (c) => {
  const auth = getAuthUser(c);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch (error) {
    console.error("[sessions.revoke-others] JSON inválido:", error);
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const response = await handleRevokeOthersRoute(auth.userId, body, auth.sessionId);
  return c.json(response.payload, response.status);
});

const isVitest = Boolean(process.env.VITEST);

if (!isVitest) {
  const port = Number(process.env.PORT) || 3000;
  serve({ fetch: app.fetch, port });
  console.log(`Listening on ${port}`);
}