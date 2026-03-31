# GitHub Copilot — Project Instructions

See **[AGENTS.md](../AGENTS.md)** for full project context, tech stack, coding standards, and rules.

---

## Copilot-Specific Behaviour

- When suggesting completions in `apps/server`, prefer Bun + Hono patterns over Express
- When completing Socket.io handlers, always infer types from `packages/shared/src/types/socket.ts`
- Use `pnpm` — never suggest `npm` or `yarn` commands
- Suggest Drizzle query builder syntax, never raw SQL strings
- For new React components, scaffold with Tailwind v4 utility classes matching the project color palette:
  - Background: `bg-[#0f0c29]`
  - Gold accent: `text-[#ffd700]`
  - Table felt: `bg-[#1a6b3c]`
