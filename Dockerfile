FROM node:lts-alpine
WORKDIR /app
COPY . .
RUN npm i -g corepack@latest
RUN corepack enable
RUN pnpm install
RUN pnpm run build
EXPOSE 8080
CMD [ "node", "dist/main.js" ]