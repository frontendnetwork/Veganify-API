FROM node:lts-alpine

WORKDIR /app
COPY . .
RUN npm install
RUN npm run start:prod

EXPOSE 8080
CMD [ "node", "dist/app.js" ]