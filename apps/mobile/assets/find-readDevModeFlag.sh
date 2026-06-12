#!/bin/bash
# Rode na raiz do monorepo para localizar readDevModeFlag
echo "=== Procurando readDevModeFlag em todo o projeto ==="
grep -r "readDevModeFlag" . \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  -l

echo ""
echo "=== Conteúdo das ocorrências ==="
grep -r "readDevModeFlag" . \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  -n
