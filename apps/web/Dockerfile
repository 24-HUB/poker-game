# Use official Bun image
FROM oven/bun:1.1 AS base
WORKDIR /usr/src/app

# Copy root config files
COPY package.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Copy web app
COPY apps/web ./apps/web

# Install dependencies from root for the whole monorepo
RUN bun install

# Final stage for web
WORKDIR /usr/src/app/apps/web
EXPOSE 5173
CMD ["bun", "run", "dev", "--host"]
