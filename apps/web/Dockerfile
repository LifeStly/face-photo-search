FROM node:20-bookworm-slim AS base
WORKDIR /app

# system deps for canvas + sharp + better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# install deps
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/
RUN npm install --workspace apps/web --include-workspace-root

# build
FROM base AS builder
COPY . .
RUN npm --workspace apps/web run build

# runtime
FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 libvips \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
