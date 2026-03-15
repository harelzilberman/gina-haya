FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm@latest
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @gina-haya/shared build
RUN pnpm --filter @gina-haya/api build
EXPOSE 3001
CMD ["node", "packages/api/dist/index.js"]
