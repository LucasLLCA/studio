# Estágio de build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./ 
RUN npm ci
COPY . .
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3050

ENV PORT 3050
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 