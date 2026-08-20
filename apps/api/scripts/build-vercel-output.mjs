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
// existe em runtime. Por isso tudo é bundlado (sem --external), incluindo
// as dependências npm reais: elas ficam soltas, sem essa deploy sendo dona
// de um node_modules próprio.
//
// --format=cjs, não esm: dependências CJS com require() de builtins do Node
// (pino → "node:os", entre outras) quebravam em runtime só na Vercel
// ("Dynamic require of ... is not supported") quando bundladas junto de um
// output ESM — o shim de interop que o esbuild gera pra isso não roda no
// launcher Node customizado da Vercel, mesmo funcionando local. Saída CJS
// não precisa desse shim: require() dentro de código CJS bundlado em CJS é
// nativo, sem interop nenhum.
execSync(
  `esbuild src/vercel-handler.ts --bundle --platform=node --format=cjs --target=node22 --outfile=${funcDir}/index.js`,
  { stdio: "inherit" }
);

// Sem isso, o Node sobe a árvore de diretórios, acha apps/api/package.json
// ("type": "module") e trata este index.js — que é CJS de verdade — como
// ESM: sem erro, mas module.exports vira um no-op e os exports somem.
writeFileSync(`${funcDir}/package.json`, JSON.stringify({ type: "commonjs" }, null, 2));

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.js",
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
