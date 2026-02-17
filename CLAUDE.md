# AI Workflow Orchestration — Claude Code Reference

## Quick Start
```bash
npm install
npm run dev     # Dev server on port 5000
npm run build   # Production build
npm run start   # Production server
npm run db:push # Push schema to database
```

## Stack
- **Frontend**: React 19, Vite 5, TypeScript, Tailwind CSS v4, shadcn/ui (Radix)
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **AI**: Anthropic Claude SDK (claude-sonnet-4-5)
- **Workflow Viz**: React Flow
- **Charts**: Recharts + custom SVG
- **Export**: ExcelJS + HTML report (print-to-PDF)
- **Routing**: Wouter
- **State**: TanStack React Query

## Key Patterns
- `apiRequest(method, url, data?)` — method is FIRST param. Sends X-Owner-Token header automatically.
- Anonymous owner token: `getOwnerToken()` in `client/src/lib/queryClient.ts`
- Schema uses JSONB columns with `$type<>` for type safety
- Route params: `:projectId` in App.tsx routes (use `useParams<{ projectId: string }>()`)
- Section update endpoint: `PUT /api/scenarios/:id/section/:step` accepts both step numbers (0-7) and section names (strategic_themes, etc.)

## Brand Colors
- Navy: `#001278` (primary)
- Blue: `#02a2fd` (secondary)
- Green: `#36bf78` (accent)

## Project Structure
```
client/src/pages/       # 12 page components (10 workflow steps + Home + SharedReport)
client/src/components/  # Layout, StepperNav, ThemeToggle
client/src/components/ui/ # 20 shadcn/ui components
server/                 # Express routes, calculation engine, AI assistant, export
shared/                 # Drizzle schema, TypeScript types, formulas, patterns
```

## Environment Variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` — For AI assistant feature

## Database
- 4 tables: projects, scenarios, share_links, ai_conversations
- Run `npm run db:push` to apply schema changes
- All step data stored as JSONB in scenarios table
