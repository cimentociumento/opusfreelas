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

// Build Output API v3 não traça node_modules pra gente como o zero-config
// da Vercel fazia — o que não estiver dentro deste arquivo simplesmente não
// existe em runtime. Por isso tudo é bundlado (nenhum --external), incluindo
// as dependências npm reais: elas ficam soltas, sem essa deploy sendo dona
// de um node_modules próprio.
execSync(
  `esbuild src/vercel-handler.ts --bundle --platform=node --format=esm --target=node22 --outfile=${funcDir}/index.mjs`,
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
