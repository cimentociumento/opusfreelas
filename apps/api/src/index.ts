import { serve } from "@hono/node-server";
import { Hono } from "hono";

export const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

const isVitest = Boolean(process.env.VITEST);

if (!isVitest) {
  const port = Number(process.env.PORT) || 3000;
  serve({ fetch: app.fetch, port });
  console.log(`Listening on ${port}`);
}
