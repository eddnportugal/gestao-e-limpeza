FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache chromium wget
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/pdf/templates ./dist/pdf/templates

EXPOSE 3000

CMD ["node", "dist/main"]
