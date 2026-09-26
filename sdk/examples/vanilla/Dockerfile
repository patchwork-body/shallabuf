FROM oven/bun:1-slim

WORKDIR /app

COPY ./dist ./dist
COPY ./package.json ./package.json
COPY ./src/server.ts ./src/server.ts

EXPOSE 3000

CMD ["bun", "run", "start"]
