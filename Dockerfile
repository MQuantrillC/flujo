# Flujo en un contenedor. La base SQLite y las imágenes viven en /data: monta ahí
# un volumen persistente (Railway, Fly.io, una VM) y sobreviven a cada despliegue.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
# better-sqlite3 trae binarios precompilados; python3/make/g++ sólo por si hiciera falta compilarlo.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS run
ENV NODE_ENV=production
ENV PORT=3100
ENV FLUJO_DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
VOLUME ["/data"]
EXPOSE 3100
CMD ["node", "server.js"]
