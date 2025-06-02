# Estágio de build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci

# Copiar o resto dos arquivos
COPY . .

# Build da aplicação
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS runner

WORKDIR /app

# Definir variável de ambiente para produção
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUMMARY_API_URL=http://localhost:8000

# Copiar arquivos necessários do estágio de build
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expor a porta que a aplicação usa
EXPOSE 9002

# Comando para iniciar a aplicação
CMD ["node", "server.js"] 