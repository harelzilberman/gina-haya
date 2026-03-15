FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./

# Copy only the packages we need
COPY packages/shared ./packages/shared
COPY packages/i18n ./packages/i18n
COPY packages/api ./packages/api

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared then api
RUN pnpm --filter @gina-haya/shared build
RUN pnpm --filter @gina-haya/api build

EXPOSE 3001

CMD ["node", "packages/api/dist/index.js"]
