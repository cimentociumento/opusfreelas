import { httpInstrumentationMiddleware } from "@hono/otel";
import pino from "pino";
import type { Hono } from "hono";

const logger = pino({
  // Evita flood de logs de todas as requisições em desenvolvimento.
  // Se quiser ver detalhes, defina LOG_LEVEL=info ou debug no ambiente.
  level: process.env.LOG_LEVEL ?? "warn",
  base: { service: process.env.OTEL_SERVICE_NAME ?? "amauc-api" },
});

export function initObservability(app: Hono) {
  app.use(
    "*",
    httpInstrumentationMiddleware({
      serviceName: process.env.OTEL_SERVICE_NAME ?? "amauc-api",
    })
  );

  app.use("*", async (c, next) => {
    const startedAt = Date.now();
    await next();

    // Evita flood de logs de cada chamada RPC em desenvolvimento.
    // Mantém apenas logs de erro/avisos visíveis; requisições normais ficam em debug.
    const level = c.res.status >= 400 ? "warn" : "debug";
    logger[level]({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  });
}