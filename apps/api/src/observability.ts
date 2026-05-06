import { httpInstrumentationMiddleware } from "@hono/otel";
import pino from "pino";
import type { Hono } from "hono";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
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

    // Avoid logging body payloads/PII (e.g. phone numbers) here.
    logger.info({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  });
}