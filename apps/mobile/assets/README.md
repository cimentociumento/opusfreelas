# Fix v2 — Erro `readDevModeFlag is not a function`

## Causa raiz

O pacote `@amauc/shared` exporta `readDevModeFlag`, mas a implementação
usa `SecureStore` ou uma API síncrona que **não existe no Expo Go nem no web**.

O `app/index.tsx` chamava essa função no `handleEnter` (provavelmente
via `DevModeToggle` → `useDevelopmentMode` → `readDevModeFlag`).

## Arquivos deste fix

```
fix-v2/
├── hooks/
│   └── use-development-mode.ts   ← substitui apps/mobile/hooks/
├── components/
│   ├── DevModeToggle.tsx          ← substitui apps/mobile/components/
│   └── DevAuthWrapper.tsx         ← substitui apps/mobile/components/
├── app/
│   └── index.tsx                  ← substitui apps/mobile/app/
├── shared-patch/
│   └── dev-mode.ts                ← COLOQUE em packages/shared/src/
└── find-readDevModeFlag.sh        ← rode para achar a origem exata
```

## Passo a passo

### 1. Encontre a origem do problema

```bash
chmod +x find-readDevModeFlag.sh
./find-readDevModeFlag.sh
```

Isso vai mostrar exatamente onde `readDevModeFlag` está definida.

### 2. Substitua os arquivos do mobile

```bash
cp hooks/use-development-mode.ts  apps/mobile/hooks/
cp components/DevModeToggle.tsx   apps/mobile/components/
cp components/DevAuthWrapper.tsx  apps/mobile/components/
cp app/index.tsx                  apps/mobile/app/
```

### 3. Corrija o shared (se necessário)

Se o script do passo 1 apontar para `packages/shared/src/`, substitua
ou corrija o arquivo que define `readDevModeFlag` pelo conteúdo de
`shared-patch/dev-mode.ts`.

Se a função está em `packages/shared/src/index.ts`, adicione:

```ts
// SUBSTITUIR a implementação atual por:
export async function readDevModeFlag(): Promise<boolean> {
  try {
    const AsyncStorage = (await import(
      "@react-native-async-storage/async-storage"
    )).default;
    const value = await AsyncStorage.getItem("@opusfreelas_dev_mode");
    return value === "true";
  } catch {
    return false;
  }
}
```

### 4. Limpe e reinicie

```bash
cd apps/mobile
npx expo start --clear
```

## Por que AsyncStorage e não SecureStore?

| | SecureStore | AsyncStorage |
|---|---|---|
| Expo Go | ❌ Requer build nativo | ✅ Funciona |
| Web | ❌ Não existe | ✅ Funciona (usa localStorage) |
| Produção (EAS Build) | ✅ Mais seguro | ⚠️ Menos seguro |

Para modo dev toggle, AsyncStorage é suficiente — não é dado sensível.
