FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@8.15.0
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @gina-haya/shared build
EXPOSE 3001
CMD ["npx", "tsx", "packages/api/src/index.ts"]
