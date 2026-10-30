FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY . .

RUN chown -R node:node /app

EXPOSE 8080

USER node

CMD ["node", "server.js"]