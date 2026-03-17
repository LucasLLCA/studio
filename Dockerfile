# Estágio 1: Dependências
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar dependências necessárias para compilação
RUN apk add --no-cache libc6-compat

# Copiar apenas arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências de produção e desenvolvimento
RUN npm ci --legacy-peer-deps

# Estágio 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Desabilitar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# basePath must be set at build time (baked into the Next.js output)
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}

# Build da aplicação (gera .next/standalone)
RUN npm run build

# Estágio 3: Runner (Produção)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar build standalone (já inclui node_modules mínimos)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

EXPOSE 80

ENV PORT=80
ENV HOSTNAME="0.0.0.0"

# OpenTelemetry configuration
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otelcollectorhttp.10.0.122.91.sslip.io
ENV OTEL_SERVICE_NAME=studio-frontend

CMD ["node", "server.js"]
 