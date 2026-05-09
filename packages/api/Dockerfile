FROM node:22-alpine

WORKDIR /app

# Copy ALL workspace package.json files first
COPY package.json pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copy i18n fully (workspace dependency, not just package.json)
COPY packages/i18n ./packages/i18n/

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Install ALL dependencies including devDependencies (tsc needs to be available)
RUN pnpm install --no-frozen-lockfile

# Copy source AFTER install so node_modules are populated first
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build in dependency order
RUN pnpm --filter @gina-haya/shared build
RUN pnpm --filter @gina-haya/i18n build
RUN pnpm --filter @gina-haya/api build

EXPOSE 3000

CMD ["node", "packages/api/dist/index.js"]
