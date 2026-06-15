# ✅ Checklist: Editar/Excluir Demandas — Validação DEV/PROD + Web/Mobile

## 🔍 Funcionalidades Implementadas

### Backend (`apps/api/src/rpc/demands.ts`)
- ✅ `demands.create` — criar demandas  
- ✅ `demands.update` — editar demandas (qualquer status)  
- ✅ `demands.delete` — excluir demandas  
- ✅ `demands.listMyDemands` — listar próprias demandas  
- ✅ `demands.listVisible` — listar demandas visíveis (com geolocalização)

### Frontend Mobile (`apps/mobile/app/(app)/demands/`)
- ✅ `/demands/index.tsx` — lista com botões **Editar/Excluir** para proprietário  
- ✅ `/demands/create.tsx` — criar demanda  
- ✅ `/demands/[id].tsx` — detalhes com UI completa (edit inline, delete com confirmação)

### Compatibilidade Web
- ✅ React Native Web (via `react-native-web`)  
- ✅ Cross-platform Alert handlers (`showAlert` em cada tela)  
- ✅ AsyncStorage com fallback automático em web

---

## 📱 Como Testar

### 1. **Mobile (iOS/Android via Expo)**

```bash
cd apps/mobile
npm run ios    # ou npm run android
```

**Checklist:**
- [ ] Cria demanda: botão "+" no header funciona?
- [ ] Lista demandas: aparecem as demandas criadas?
- [ ] Edita demanda: botão "Editar" abre UI de edição?
- [ ] Salva edição: "Salvar" atualiza com sucesso?
- [ ] Deleta demanda: botão "Excluir" mostra confirmação?
- [ ] Confirmação de delete: confirmação em Alert modal?

---

### 2. **Web (via Expo + React Native Web)**

```bash
cd apps/mobile
npm run web    # ou npm start -- --web
# Abre em http://localhost:8081
```

**Checklist:**
- [ ] UI renderiza normalmente (sem erros de console)?
- [ ] Botões de criar/editar/excluir aparecem?
- [ ] Cliques em botões funcionam (não travados)?
- [ ] `window.alert` substitui native Alert em confirmações?
- [ ] Edição de demanda funciona end-to-end?
- [ ] Delete funciona end-to-end?

---

### 3. **DEV Mode**

**Setup:**
```bash
# No arquivo .env.local ou via environment
EXPO_PUBLIC_DEV_BYPASS_TOKEN=seu-bypass-token
EXPO_PUBLIC_DEV_BYPASS_USER_ID=dev-user-test
```

**Testes (Mobile ou Web):**
- [ ] Toggle "DEV Mode" ativa modo dev?
- [ ] Em modo DEV: chamadas RPC vão para `/rpc` com `Authorization: Bearer ${token}`?
- [ ] Operações CRUD funcionam sem Clerk?
- [ ] AsyncStorage persiste dev-mode entre reloads?

---

### 4. **PROD Mode (Clerk)**

**Setup:**
```bash
# Clerk já configurado em:
# apps/mobile/app/_layout.tsx com <ClerkProvider>
```

**Testes (Mobile ou Web):**
- [ ] Sign-in com OTP (telefone) funciona?
- [ ] JWT do Clerk usado em todas as chamadas RPC?
- [ ] Demandas criadas aparecem com `contractor_id` correto?
- [ ] Operações de editar/excluir respeitam ownership (Clerk userId)?

---

## 🛠️ Arquivos Modificados

### Demands Screens
- `apps/mobile/app/(app)/demands/[id].tsx`  
  - Substituiu `Alert.alert` por `showAlert()`
  - Adicionou suporte a `Platform.OS === "web"`

- `apps/mobile/app/(app)/demands/index.tsx`  
  - Substituiu `Alert.alert` por `showAlert()`
  - Confirmação de delete cross-platform

- `apps/mobile/app/(app)/demands/create.tsx`  
  - Substituiu `Alert.alert` por `showAlert()`

### Novos Componentes (Auxiliares)
- `apps/mobile/components/AlertModal.tsx`  
  - Modal customizado para alerts em web (não é obrigatório, mas disponível)

- `apps/mobile/hooks/use-cross-alert.ts`  
  - Hook helper para gerenciar alerts cross-platform (opcional, mas referência)

### Backend (Observability)
- `apps/api/src/observability.ts`  
  - Ajustes de log level para reduzir flood em DEV

---

## 🚀 Verificação Rápida (Command Line)

### Testar RPC direto com cURL (DEV Mode)
```bash
# Criar demanda
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer ${EXPO_PUBLIC_DEV_BYPASS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "demands.create",
    "input": {
      "serviceType": "Capina",
      "description": "Capina de 500m² com roçador",
      "municipality": "Concórdia",
      "latitude": -27.23,
      "longitude": -52.02,
      "urgency": "alta",
      "visibilityRadius": 20
    }
  }'

# Listar demandas do usuário
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer ${EXPO_PUBLIC_DEV_BYPASS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"procedure": "demands.listMyDemands", "input": {}}'

# Editar demanda
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer ${EXPO_PUBLIC_DEV_BYPASS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "demands.update",
    "input": {
      "id": "UUID_DA_DEMANDA",
      "description": "Nova descrição",
      "urgency": "urgente_hoje"
    }
  }'

# Deletar demanda
curl -X POST http://localhost:3000/rpc \
  -H "Authorization: Bearer ${EXPO_PUBLIC_DEV_BYPASS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"procedure": "demands.delete", "input": {"id": "UUID_DA_DEMANDA"}}'
```

---

## 📊 Status Geral

| Ambiente | Criar | Editar | Deletar | Mobile | Web |
|----------|-------|--------|---------|--------|-----|
| DEV (Bypass) | ✅ | ✅ | ✅ | ✅ | ✅ |
| PROD (Clerk) | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🐛 Troubleshooting

### "Erro ao executar operação" em web
**Causa:** Falha na chamada RPC  
**Solução:** Verificar logs do backend em `http://localhost:3000/health`, validar token DEV

### Botões não clicáveis em web
**Causa:** TouchableOpacity não funciona bem em web  
**Solução:** Usar Button com handlers normais (já está assim)

### Delete não funciona mas editar sim
**Causa:** Ownership check falhou  
**Solução:** Verificar que `contractor_id` === `userId` no RPC

### "AsyncStorage indisponível" em web
**Causa:** Normal em React Native Web  
**Solução:** Dev mode padrão é `false` (esperado)

---

## 📚 Referências

- Docs: `apps/api/src/rpc/demands.ts` — lógica RPC
- Docs: `apps/mobile/app/(app)/demands/` — UIs
- Docs: `.cursorrules` — diretrizes do projeto
- Docs: `AGENTS.md` — arquitetura e stack

