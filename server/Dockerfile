FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/dist/db /app/dist/db
COPY --from=builder /app/src/db/migrations /app/dist/db/migrations
RUN test -f /app/dist/db/database.js

# Criar diretórios de upload com permissões corretas + entrypoint script
RUN mkdir -p uploads/avatars uploads/documentos uploads/fotos uploads/qrcodes && \
    chown -R nodejs:nodejs /app/dist && \
    chmod -R 755 /app/dist && \
    chown -R nodejs:nodejs uploads && \
    printf '#!/bin/sh\n' > /app/entrypoint.sh && \
    printf 'chown -R nodejs:nodejs /app/uploads 2>/dev/null || true\n' >> /app/entrypoint.sh && \
    printf 'exec su-exec nodejs "$@"\n' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh && \
    apk add --no-cache su-exec

EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]
