# Fix v3 — Correção mínima e cirúrgica

## O que estava errado nos fixes anteriores

**Fix v1 e v2**: Trocaram o SDK 54 → SDK 51, quebrando o `Stack` do
`expo-router` (APIs incompatíveis entre versão 3.x e 6.x).

**Este fix (v3)**: Mantém 100% das versões originais. Corrige
**somente** o que impede o Expo Go de funcionar.

---

## Arquivos alterados (apenas 3)

### 1. `apps/mobile/app/_layout.tsx`
**Problema**: importava `tokenCache` do `@clerk/clerk-expo/token-cache`,
que usa `expo-secure-store` internamente. SecureStore requer build nativo.

**Fix**: Define `tokenCache` inline com `AsyncStorage`.

### 2. `apps/mobile/app.json`
**Problema**: `expo-secure-store` listado nos `plugins` faz o Metro
tentar carregar código nativo ausente no Expo Go.

**Fix**: Remove `expo-secure-store` dos `plugins` (o pacote continua
instalado, só não é inicializado como plugin nativo).

### 3. `apps/mobile/package.json`
Sem alteração de versões — apenas garante que
`@react-native-async-storage/async-storage` está presente
(já estava no original).

---

## Como aplicar

```bash
# Na raiz do monorepo
cp fix-v3/app/_layout.tsx  apps/mobile/app/_layout.tsx
cp fix-v3/app.json         apps/mobile/app.json
cp fix-v3/package.json     apps/mobile/package.json

# Reinstalar dependências
pnpm install

# Limpar cache e iniciar
cd apps/mobile
npx expo start --clear
```

---

## Sobre o erro `readDevModeFlag is not a function`

Se esse erro ainda aparecer depois deste fix, o problema está no
`packages/shared/src/`. Rode na raiz do monorepo:

```bash
grep -r "readDevModeFlag" packages/ --include="*.ts" --include="*.tsx" -n
```

E nos arquivos encontrados, troque qualquer uso de `SecureStore` por
`AsyncStorage`, tornando a função assíncrona.
