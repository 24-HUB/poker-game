FROM node:22.16.0-bookworm
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Build context MUST be the allowlisted git archive described in README.md.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/poker-engine/package.json packages/poker-engine/package.json
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
    && pnpm install --frozen-lockfile \
    && pnpm --filter @poker/web exec playwright install --with-deps chromium
COPY . .
RUN pnpm build
ARG CANDIDATE
LABEL poker.restore.candidate=$CANDIDATE
CMD ["sleep", "infinity"]
