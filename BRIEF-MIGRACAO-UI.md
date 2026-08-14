# Brief de execução — migração de UI para NativeWind + React Native Reusables

Documento para o Claude Code executar. Toda informação de versão e
compatibilidade abaixo **já foi verificada empiricamente** — instalar, resolver
peers, compilar Tailwind e rodar o transform do Babel com a stack real deste
projeto. Não re-pesquise nem substitua versão por "a mais recente".

---

## 1. Objetivo

Elevar o padrão visual do app mobile adotando NativeWind (camada de estilo) e
React Native Reusables (componentes copiados para dentro do repositório).
Direção visual escolhida: **limpo e neutro**, na linha de Linear, Notion e
Vercel — que é a estética-casa do shadcn/ui, implementada pelo RNR.

Isto **não** é uma reescrita. É migração incremental, uma tela por vez, com
possibilidade de abortar a qualquer momento sem perda.

## 2. Contexto do projeto

Monorepo pnpm + Turborepo. O alvo é `apps/mobile`.

- Expo SDK 55, React Native 0.83.6, React 19.2.7, react-native-web 0.21.2
- expo-router, Clerk (auth), React Query
- Estilo atual: `StyleSheet.create` + design tokens em `components/theme.ts`
- Componentes próprios: `Button`, `Card`, `Toast`, `AlertModal`, `ErrorState`,
  `ErrorBoundary`
- **Sem Reanimated instalado hoje** — será adicionado, é peer obrigatório
- **Sem Tailwind hoje**
- Testes de mobile: 2 arquivos. CI **não** roda nada de mobile. Não há rede de
  segurança automática — a verificação é visual e manual.

Telas a migrar, em ordem de prioridade:
```
app/(app)/demands/index.tsx        254 linhas   ← PILOTO
app/(app)/demands/available.tsx    245 linhas
app/(app)/demands/create.tsx       257 linhas
app/(app)/demands/[id].tsx         460 linhas   ← por último, a maior
```

## 3. Fatos de compatibilidade verificados

Verificados em 2026-08-07 instalando e compilando com esta stack exata.

| Item | Valor obrigatório | Por quê |
|---|---|---|
| `nativewind` | `4.2.6` | v4.2.0+ contém o patch de compatibilidade com Reanimated v4 |
| `tailwindcss` | `3.4.19` (v3.4.x) | Tailwind v4 é só para NativeWind v5, que ainda é preview |
| `react-native-reanimated` | via `expo install` (resolve 4.x) | peer obrigatório do NativeWind; Reanimated 4 exige New Architecture, que o SDK 55 já usa |
| `babel-preset-expo` | `55.0.24` (já no projeto) | confirmado funcionando com `jsxImportSource: "nativewind"` |

Evidência do teste: o transform do Babel roteou o JSX por
`react-native-css-interop/jsx-runtime` e preservou `className`; o Tailwind 3.4.19
compilou com `nativewind/preset` e detectou as classes; `nativewind/metro`
exporta `withNativeWind`.

### Armadilhas confirmadas — não caia nelas

1. **Não instale Tailwind 4.x.** Quebra com NativeWind 4. Fixe `3.4.19`.
2. **Não adicione `react-native-worklets/plugin`.** No Reanimated v4 o plugin de
   worklets já vem dentro de `react-native-reanimated/plugin`. Adicionar os dois
   dá erro de plugin duplicado.
3. **Não instale `nativewind@5` / preview.** Setup diferente, exige Tailwind 4,
   ainda pré-release.
4. **Não crie `postcss.config.js`.** Desnecessário em projeto Expo com NativeWind 4.
5. **Limpe cache após mexer em babel/metro.** Sem isso parece que não funcionou:
   `rm -rf node_modules/.cache .expo`
6. **Não use `expo install` para o Tailwind** — é devDependency, vai por `pnpm add -D`.

## 4. Direção visual

Ver `.claude/skills/design-system/SKILL.md`, que é a autoridade. Resumo:

Superfície branca, neutros quentes, bordas discretas em vez de sombra, um acento
por tela, espaçamento pela escala do Tailwind sem número mágico, duas famílias
tipográficas no máximo, alvo de toque ≥ 44pt, contraste ≥ 4.5:1.

O verde da marca atual (`#116530`) vira `--primary` e fica reservado para a ação
principal. Todo o resto é neutro. Os demais tokens do `theme.ts` atual
(`#22c55e`, `#f59e0b`, `#ef4444`, `#e5e7eb`) são defaults do Tailwind e devem ser
substituídos pelos tokens semânticos do shadcn (`--destructive`, `--muted`,
`--border`), não transportados.

**Não invente direção nova.** Os componentes do RNR já vêm nessa estética.
Adote-os como vêm; "melhorar" o visual deles é como o app chegou onde chegou.

## 5. Execução

Trabalhe em `feat/nativewind-piloto`. Cada fase termina com um gate de
verificação. **Não avance de fase com o gate vermelho.** Se um gate falhar duas
vezes, pare e reporte em vez de tentar uma terceira abordagem.

### Fase 0 — Linha de base
Antes de instalar nada:
1. Rode `cd apps/mobile && pnpm web` e capture screenshot de `demands/index`
   com Playwright MCP, em 375px e 1440px. Salve como referência do "antes".
2. Rode `pnpm --filter @amauc/mobile typecheck` e registre a saída.

**Gate 0:** existe screenshot do antes e a saída do typecheck está registrada.

### Fase 1 — Instalação
```bash
cd apps/mobile
npx expo install nativewind@4.2.6 react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@3.4.19 prettier-plugin-tailwindcss
```

`apps/mobile/babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
```

`apps/mobile/metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
module.exports = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
```

Em monorepo pnpm, confirme que o `getDefaultConfig` está resolvendo a raiz do
workspace corretamente antes de seguir.

`apps/mobile/nativewind-env.d.ts`:
```ts
/// <reference types="nativewind/types" />
```

Importe `./global.css` no topo de `app/_layout.tsx`.

Depois: `rm -rf node_modules/.cache .expo`

**Gate 1:** `pnpm web` sobe sem erro e um `<View className="bg-red-500 h-10" />`
temporário renderiza vermelho. Remova o teste depois de confirmar.

### Fase 2 — Tokens
Crie `apps/mobile/global.css` com as variáveis do shadcn no formato HSL, e
`tailwind.config.js` mapeando-as. `--primary` recebe o verde da marca
`hsl(142 71% 23%)`. `--radius` uniforme.

Inclua o bloco `.dark:root` mesmo sem alternador de tema ainda — sai de graça
agora e evita retrabalho.

`tailwind.config.js` precisa de `presets: [require("nativewind/preset")]` e
`content` cobrindo `./app/**/*.{ts,tsx}` e `./components/**/*.{ts,tsx}`.

**Gate 2:** `bg-primary` renderiza o verde da marca e `border-border` renderiza
a borda neutra.

### Fase 3 — Componentes base
```bash
npx @react-native-reusables/cli@latest add button card text
```
O código vai para `components/ui/`. É nosso a partir daí.

Não delete `components/Button.tsx` ainda — as outras telas ainda importam dele.
Coexistência é intencional durante a migração.

**Gate 3:** o `Button` do RNR renderiza em uma tela de teste, nas três
plataformas (iOS, Android, Web).

### Fase 4 — Tela piloto
Migre **somente** `app/(app)/demands/index.tsx`.

- Substitua `StyleSheet.create` por `className`.
- Troque `components/Button` por `components/ui/button`.
- Garanta os quatro estados: carregando, vazio, erro, conteúdo.
- Preserve comportamento. Se encontrar um bug durante a migração, **não corrija
  agora** — anote e trate depois com a skill `root-cause-fix`. Misturar migração
  com correção torna impossível saber o que quebrou.

**Gate 4:** capture screenshot do depois em 375px e 1440px, compare com a
referência da Fase 0, e confirme que toda função da tela continua operando nas
três plataformas.

### Fase 5 — Decisão
Apresente antes e depois lado a lado e **pare**. A decisão de seguir para as
outras três telas é do usuário, não sua.

Se ele aprovar: repita a Fase 4 para `available.tsx`, depois `create.tsx`,
depois `[id].tsx` — uma tela por commit.
Se ele recusar: `git checkout main && git branch -D feat/nativewind-piloto`.
Nada se perde.

## 6. Regras que valem o tempo todo

- Um commit por fase, Conventional Commits. Migração e correção nunca no mesmo commit.
- Diff mínimo. Não reescreva o que não precisa mudar.
- Nunca `as any` nem `@ts-ignore` para silenciar erro de tipo.
- Nada de `bg-[#116530]` — cor literal em className é o mesmo erro do valor
  hardcoded no StyleSheet.
- Mostre evidência, não afirmação: cole a saída do comando e o screenshot. Dizer
  "deve funcionar agora" não é verificação.
- Se uma abordagem falhar duas vezes, declare a hipótese errada e reporte em vez
  de tentar uma terceira variação.

## 7. Definição de pronto (por fase)

- [ ] Gate da fase verde, com evidência colada
- [ ] `pnpm --filter @amauc/mobile typecheck` sem erro novo
- [ ] Testado em iOS, Android e Web
- [ ] Nenhum warning novo no terminal do Expo
- [ ] Commit isolado, mensagem descrevendo só o que aquela fase fez
