FROM oven/bun:latest AS builder

WORKDIR /app

COPY . .

#install openssl for prisma
RUN apt-get update && apt-get install -y openssl libssl-dev

RUN bun install

RUN bunx prisma generate

RUN bun run compile

EXPOSE 8000

ENTRYPOINT [ "bun", "start" ]