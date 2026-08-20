// dotenv só existe pra carregar .env em dev local — na Vercel as env vars já
// vêm prontas em process.env, e o pacote (CJS, usa require("fs") internamente)
// não bundla de forma segura pro formato ESM do handler serverless. Import
// dinâmico + guarda evita executar (e evita até precisar resolver) esse
// caminho em produção.
if (!process.env.VERCEL) {
  await import("dotenv/config.js");
}
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireClerkAuth, getAuthUser } from "./middleware/clerk.js";
import { handleRpc } from "./rpc/router.js";
import { handleRevokeOthersRoute } from "./sessions/revoke.js";
import { initObservability } from "./observability.js";

export const app = new Hono();

initObservability(app);

app.use("*", async (c, next) => {
  // Chrome bloqueia fetch()/XHR de uma página em localhost para outra porta
  // em 127.0.0.1 sob a política de Private Network Access — mesmo sendo tudo
  // loopback — a menos que o preflight responda este header. Sem ele o fetch
  // falha com "TypeError: Failed to fetch" genérico; navegação direta (GET
  // de página inteira) não passa por essa checagem, por isso funciona mesmo
  // com o bug presente. hono/cors não emite este header nesta versão.
  if (c.req.header("Access-Control-Request-Private-Network") === "true") {
    c.header("Access-Control-Allow-Private-Network", "true");
  }
  await next();
});

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
// Vercel injeta VERCEL=1 em build e runtime. Sob a função serverless
// (api/index.ts), este módulo é só importado pelo adaptador hono/vercel —
// abrir um listener próprio aqui dentro da invocação seria redundante e
// conflita com o jeito que o runtime da Vercel invoca a função.
const isServerless = Boolean(process.env.VERCEL);

if (!isVitest && !isServerless) {
  const port = Number(process.env.PORT) || 3000;
  serve({ fetch: app.fetch, port });
  console.log(`Listening on ${port}`);
}