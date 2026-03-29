#!/bin/bash
# AppVistoria — Deploy script
# Uso: bash deploy.sh
# Requer: ~/.ssh/hetzner_key configurada

set -e

SERVER="root@46.225.191.114"
KEY="$HOME/.ssh/hetzner_key"
REMOTE_DIR="/opt/appvistoria"
SSH="ssh -i $KEY"
SCP="scp -i $KEY"

echo "==> AppVistoria Deploy"
echo "==> Servidor: $SERVER"
echo ""

# 1. Cria diretório no servidor
echo "[1/5] Criando diretório no servidor..."
$SSH $SERVER "mkdir -p $REMOTE_DIR"

# 2. Copia arquivos
echo "[2/5] Enviando arquivos..."
$SSH $SERVER "mkdir -p $REMOTE_DIR/site"
$SCP schema.sql $SERVER:$REMOTE_DIR/schema.sql
$SCP docker-compose.yml $SERVER:$REMOTE_DIR/docker-compose.yml
$SCP .env $SERVER:$REMOTE_DIR/.env
$SCP ../appvistoria.html $SERVER:$REMOTE_DIR/site/index.html

# 3. Copia código
echo "[3/5] Enviando código fonte..."
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  -e "ssh -i $KEY" \
  api/ $SERVER:$REMOTE_DIR/api/

rsync -avz --exclude node_modules --exclude dist --exclude .git \
  -e "ssh -i $KEY" \
  web/ $SERVER:$REMOTE_DIR/web/

rsync -avz --exclude node_modules --exclude dist --exclude .git \
  -e "ssh -i $KEY" \
  pwa/ $SERVER:$REMOTE_DIR/pwa/

# 4. Build e start no servidor
echo "[4/5] Build e inicialização..."
$SSH $SERVER "cd $REMOTE_DIR && docker compose build --no-cache && docker compose up -d"

# 5. Status
echo "[5/5] Verificando status..."
$SSH $SERVER "cd $REMOTE_DIR && docker compose ps"

echo ""
echo "==> Deploy concluído!"
echo "==> API:    https://api.appvistoria.com.br"
echo "==> Admin:  https://admin.appvistoria.com.br"
echo "==> App:    https://app.appvistoria.com.br"
echo "==> Sindico: https://sindico.appvistoria.com.br"
