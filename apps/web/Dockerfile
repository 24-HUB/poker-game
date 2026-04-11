FROM oven/bun:1.1 AS base
WORKDIR /app

# Copy workspace manifest and lockfile
COPY package.json bun.lock* ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy web app
COPY apps/web ./apps/web

# Install all workspace dependencies
RUN bun install

WORKDIR /app/apps/web
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
