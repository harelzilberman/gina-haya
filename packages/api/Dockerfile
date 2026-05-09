FROM node:22-alpine

WORKDIR /app

# Install pnpm globally first
RUN npm install -g pnpm@9.15.0

# Copy workspace config — pnpm needs this to resolve workspace packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for workspace resolution
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/api/package.json ./packages/api/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json

# Install all dependencies including devDependencies
RUN pnpm install --no-frozen-lockfile

# Copy all source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY packages/i18n ./packages/i18n

# Build shared with npx tsc directly, then api via pnpm filter
RUN cd packages/shared && npx tsc
RUN pnpm --filter @gina-haya/i18n build
RUN pnpm --filter @gina-haya/api build

EXPOSE 3000
CMD ["node", "packages/api/dist/index.js"]
