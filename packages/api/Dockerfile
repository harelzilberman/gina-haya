FROM node:22-alpine

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/i18n/package.json ./packages/i18n/

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared
COPY packages/i18n ./packages/i18n

# Build shared and i18n first, then api
RUN pnpm --filter @gina-haya/shared build
RUN pnpm --filter @gina-haya/i18n build
RUN pnpm --filter @gina-haya/api build

EXPOSE 3000

CMD ["node", "packages/api/dist/index.js"]
