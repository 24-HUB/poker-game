FROM node:22.16.0-bookworm
WORKDIR /app
# Build context MUST be the allowlisted git archive described in README.md.
COPY . .
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate \
    && pnpm install --frozen-lockfile \
    && pnpm build \
    && pnpm --filter @poker/web exec playwright install --with-deps chromium
ENV NEXT_TELEMETRY_DISABLED=1
ARG CANDIDATE
LABEL poker.restore.candidate=$CANDIDATE
CMD ["sleep", "infinity"]
