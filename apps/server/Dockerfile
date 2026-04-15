FROM oven/bun:1.2 AS base
WORKDIR /app

# Copy workspace manifest and lockfile so bun can resolve workspaces
COPY package.json bun.lock* ./

# Copy shared package first (depended on by server)
COPY packages/shared ./packages/shared

# Copy server source
COPY apps/server ./apps/server

# Install all workspace dependencies
RUN bun install

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["bun", "run", "src/server.js"]
