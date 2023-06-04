FROM node:lts-alpine

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

EXPOSE 8080
CMD [ "node", "dist/app.js" ]