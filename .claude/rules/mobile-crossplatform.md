---
paths:
  - "apps/mobile/**"
---

Alvo é iOS, Android E Web (react-native-web). Bug marcado como multiplataforma
não está resolvido até passar nos três.

Divergências conhecidas que causam bug:
- `Alert.alert` não funciona no Web. Usar o helper cross-platform já existente
  (`showAlert` / `hooks/use-cross-alert.ts`).
- AsyncStorage é indisponível no Web; há fallback. Não assumir persistência
  idêntica entre plataformas.
- `TouchableOpacity` tem comportamento pobre no Web; preferir o componente
  `Button` do projeto com handler normal.
- Deep link e parsing de token OTP diferem entre iOS e Android.

Estilo vem exclusivamente dos design tokens em `components/theme.ts` — cores,
spacing, borderRadius e typography. Valor hardcoded em `StyleSheet.create` é
defeito de consistência.

`apps/mobile/assets/` é para recursos estáticos (imagens, fontes). Código
`.ts`/`.tsx` ali é resíduo — não importar de lá, não editar para "corrigir".
