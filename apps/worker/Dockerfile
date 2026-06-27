FROM node:20-bookworm-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY apps/worker/package.json apps/worker/
RUN npm install --workspace apps/worker --include-workspace-root

COPY . .
RUN npm --workspace apps/worker run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 libvips \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/worker/dist ./apps/worker/dist
COPY --from=base /app/apps/worker/package.json ./apps/worker/package.json

CMD ["node", "apps/worker/dist/index.js"]
