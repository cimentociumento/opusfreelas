// Gera .vercel/output diretamente (Build Output API v3) em vez de depender
// da detecção zero-config da Vercel para api/*.ts — essa detecção roda
// ANTES do buildCommand, então nunca via o handler bundlado que geramos
// aqui, e a Vercel servia 404 pra toda rota. Ver commit que introduziu
// este arquivo pro histórico completo do problema.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const outputDir = ".vercel/output";
const funcDir = `${outputDir}/functions/api.func`;

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

const externals = [
  "hono",
  "hono/*",
  "@hono/node-server",
  "@hono/otel",
  "@clerk/backend",
  "@supabase/supabase-js",
  "pino",
  "zod",
  "dotenv",
  "dotenv/*",
]
  .map((pkg) => `--external:${pkg}`)
  .join(" ");

execSync(
  `esbuild src/vercel-handler.ts --bundle --platform=node --format=esm --target=node22 --outfile=${funcDir}/index.mjs ${externals}`,
  { stdio: "inherit" }
);

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
    },
    null,
    2
  )
);

writeFileSync(
  `${outputDir}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: "/(.*)", dest: "/api" }],
    },
    null,
    2
  )
);

console.log("Build Output API v3 gerado em .vercel/output");
