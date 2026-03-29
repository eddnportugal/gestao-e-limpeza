# Deploy — Gestão e Limpeza (Hetzner)

## Deploy Rápido

### 1. Upload dos arquivos alterados
```powershell
# Da máquina local (PowerShell):
scp -i ~/.ssh/hetzner_key -r "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\src" root@46.225.191.114:/opt/gestao-app/
scp -i ~/.ssh/hetzner_key -r "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\server" root@46.225.191.114:/opt/gestao-app/
scp -i ~/.ssh/hetzner_key -r "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\public" root@46.225.191.114:/opt/gestao-app/
scp -i ~/.ssh/hetzner_key "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\index.html" "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\package.json" "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\package-lock.json" "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\.env" root@46.225.191.114:/opt/gestao-app/
```

### 2. Rebuild e restart no servidor
```powershell
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "cd /opt/gestao-app && docker compose down && docker compose build --no-cache && docker compose up -d"
```

Antes do rebuild, confirme que `/opt/gestao-app/.env` define `JWT_SECRET` com um valor forte e exclusivo. O `docker-compose.yml` não usa mais fallback inseguro e o backend recusa segredos padrão em produção.

### 3. Conferir se está rodando
```powershell
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker ps --filter name=gestao-app --format 'table {{.Names}}\t{{.Status}}'"
```

---

## Estrutura no Servidor

| Item | Caminho |
|------|---------|
| Projeto | `/opt/gestao-app/` |
| Dockerfile | `/opt/gestao-app/Dockerfile` |
| docker-compose | `/opt/gestao-app/docker-compose.yml` |
| Nginx config | `/opt/gestao-app/nginx.conf` |
| Código fonte | `/opt/gestao-app/src/` |
| Assets | `/opt/gestao-app/public/` |
| Variáveis | `/opt/gestao-app/.env` |

## Dados Importantes

- **Servidor:** 46.225.191.114 (Hetzner, Ubuntu 22.04, 2 vCPU, 4GB RAM)
- **SSH:** `ssh -i ~/.ssh/hetzner_key root@46.225.191.114`
- **Container:** `gestao-app` (nginx:alpine)
- **Rede Docker:** `coolify` (compartilhada com Traefik)
- **Domínio:** `gestaoelimpeza.com.br` (HTTPS via Traefik/LetsEncrypt)
- **Cloudflare NS:** `audrey.ns.cloudflare.com` / `weston.ns.cloudflare.com`

## Cenários de Atualização

### Mudou schema do banco (migrações)
Executar migrações ANTES do deploy:
```powershell
# Copiar arquivo de migração
scp -i ~/.ssh/hetzner_key "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\server\src\db\migrations\001_condominios_planos.sql" root@46.225.191.114:/tmp/

# Executar no container do banco
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec -i gestao-db psql -U gestao -d gestao < /tmp/001_condominios_planos.sql"
```

Observação: o backend local agora aplica automaticamente as migrations pendentes de [server/src/db/migrations](server/src/db/migrations) no startup e registra os arquivos executados na tabela `schema_migrations`. Em produção, continue executando as migrations antes do deploy para manter o rollout previsível.

Observação adicional: em produção, use um `JWT_SECRET` gerado especificamente para o ambiente, por exemplo com `openssl rand -hex 32`, e mantenha esse valor apenas no `.env` do servidor.

### Mudou só código (CSS/TSX, sem novas dependências)
Mesmo processo — passos 1, 2 e 3 acima.

### Adicionou novas dependências (npm install)
Atualizar o `package-lock.json` local e incluir no upload do passo 1.

### Mudou Dockerfile, nginx.conf ou docker-compose.yml
```powershell
scp -i ~/.ssh/hetzner_key "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\Dockerfile" "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\docker-compose.yml" "c:\Users\HP\OneDrive\Área de Trabalho\gestao-app\nginx.conf" root@46.225.191.114:/opt/gestao-app/
```
Depois rebuild normalmente (passo 2).

## Outros Apps no Mesmo Servidor

| App | Domínio | Porta | Diretório |
|-----|---------|-------|-----------|
| app-correspondencia | appcorrespondencia.com.br | 3000 | /opt/app-correspondencia/ |
| portariax | portariax.com.br | 3001 | /opt/portariax/ |
| app-sindico | appsindico.com.br | 3000 | /opt/app-sindico/ |
| app-obras | appobras.com.br | 8080 | — |
| app-manutencao | appmanutencao.com.br | 8080 | — |
| app-reserva | appreserva.com.br | 3000 | /opt/app-reserva/ |

## Firebase

- **Projeto portariax-app:** Usado APENAS para FCM (push notifications)
- **Projeto gestaoelimpeza-app:** Atualmente usado para Auth/Firestore (migração para Hetzner pendente)
