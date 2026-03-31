# Claude / Anthropic — Project Instructions

See **[AGENTS.md](./AGENTS.md)** for full project context, tech stack, coding standards, and rules.

---

## Claude-Specific Behaviour

- Prefer Bun APIs over Node.js equivalents in `apps/server`
- Use Hono's `c.req.valid('json')` pattern (Zod already integrated) for route validation
- When generating Drizzle schema, always include `createdAt` / `updatedAt` timestamps
- For Socket.io event handlers, always type `socket: Socket<ClientToServerEvents, ServerToClientEvents>`
- Prefer `satisfies` operator over `as` casting in TypeScript

## Custom Agents Available

See `.copilot/agents/` for project-specific agents:
- **scaffolder** — creates new endpoints / components from existing patterns
- **fixer** — traces errors and patches them surgically
- **code-reviewer** — reviews staged changes before commit
- **integrator** — wires frontend API calls to backend endpoints
- **migration-writer** — writes safe Drizzle migrations
