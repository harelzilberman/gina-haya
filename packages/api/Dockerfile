FROM node:22-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Root TypeScript config referenced by all packages
COPY tsconfig.base.json ./

# Copy package.json files for workspace resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json

RUN pnpm install --no-frozen-lockfile

# Copy source after install
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY packages/i18n ./packages/i18n

# Build in dependency order
RUN cd packages/shared && npx tsc
RUN pnpm --filter @gina-haya/i18n build
RUN pnpm --filter @gina-haya/api build

EXPOSE 3000
CMD ["node", "packages/api/dist/index.js"]
