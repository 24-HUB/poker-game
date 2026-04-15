# Gemini — Project Instructions

See **[AGENTS.md](./AGENTS.md)** for full project context, tech stack, coding standards, and rules.

---

## Gemini-Specific Behaviour

- Prefer Bun APIs over Node.js equivalents in `apps/server`
- Use Hono's type-safe RPC client pattern when suggesting frontend API calls
- For React components, prefer named exports with explicit prop types
- When working on animations (Framer Motion), suggest `useReducedMotion()` fallbacks for accessibility
- Suggest `@tanstack/react-query` `queryOptions()` factory pattern for reusable queries
