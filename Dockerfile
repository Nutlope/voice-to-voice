FROM node:22-bookworm-slim AS build

COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY packages/realtime/package.json packages/realtime/package.json
COPY examples/demo/package.json examples/demo/package.json
RUN bun install --frozen-lockfile

COPY packages packages
COPY examples examples
RUN bun run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "start"]
