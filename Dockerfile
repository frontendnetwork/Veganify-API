FROM oven/bun:1-alpine
WORKDIR /app
COPY . .
RUN corepack enable
RUN pnpm install
RUN pnpm run build
EXPOSE 8080
CMD [ "bun", "dist/main.js" ]