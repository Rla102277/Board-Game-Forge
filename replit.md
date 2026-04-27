# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

This project hosts **GameForge**, a Replit-IDE-style SaaS for designing tabletop board games. It pairs a structured workspace (entities, rules, players, notes, tasks) with a persistent AI co-designer powered by Anthropic Claude.

## Artifacts

- `artifacts/api-server` — Express 5 API server (port 8080). All routes mounted under `/api`. Schemas validated with Zod generated from the OpenAPI spec.
- `artifacts/gameforge` — React + Vite + Tailwind v4 + shadcn frontend served at `/`. Wouter for routing, TanStack Query for data, lucide-react icons, framer-motion transitions.
- `artifacts/mockup-sandbox` — Vite preview sandbox for canvas mockups (unused for end-user product).

## Backend (artifacts/api-server)

REST + SSE Express app. Route modules in `src/routes/`:

- `health.ts` — `GET /api/healthz`
- `projects.ts` — projects CRUD + `GET /api/projects/:id/stats`
- `entities.ts` — CRUD + `POST /api/projects/:id/entities/ai-generate` (Claude generates structured entities)
- `rules.ts` — CRUD + `POST /api/projects/:id/rules/ai-generate`
- `players.ts`, `notes.ts`, `tasks.ts` — CRUD
- `chat.ts` — list/clear messages and `POST /api/projects/:id/chat/send` which **streams Claude tokens via Server-Sent Events** using `anthropic.messages.stream`. The user message is persisted before streaming, the assistant message is persisted after the stream completes. Frontend chat panel calls this endpoint with raw `fetch` + `ReadableStream` (the generated React Query hook is bypassed for streaming).
- `dashboard.ts` — `/api/dashboard/summary` (totals + game-type/genre breakdown) and `/api/dashboard/recent-activity` (merged feed from projects, entities, rules, chat).

SSE event format: `data: {"content":"..."}\n\n` for chunks, `data: {"done":true}\n\n` to close. Allowed models: `claude-sonnet-4-6`, `claude-haiku-4-5`.

## Frontend (artifacts/gameforge)

- `src/App.tsx` — Wouter routes: `/` (Home dashboard), `/p/:projectId` (Workspace).
- `src/pages/home.tsx` — Dashboard: stats cards, project grid with create/delete, recent activity feed.
- `src/pages/workspace.tsx` — IDE shell: 56px left rail, 260px section sidebar with count badges, main panel that swaps content per section, persistent 380px AI chat panel on the right.
- `src/components/chat-panel.tsx` — Streaming chat: model dropdown, message list, manual SSE consumption, two horizontally scrollable rows of chips below the input (game type + genre).
- `src/components/sections/{overview,entities,rules,players,notes,tasks}.tsx` — Each workspace section is a complete CRUD surface; entities and rules expose AI generate panels.
- `src/index.css` — Dark Replit-inspired theme (Tailwind v4 tokens).

Game type chips: Strategy, Family, Party, Cooperative, Worker Placement, Deck-builder, Area Control, Eurogame, Wargame, Roll-and-Write, Dexterity, Legacy.
Genre chips: Fantasy, Sci-Fi, Horror, Historical, Modern, Cyberpunk, Steampunk, Mystery, Adventure, Abstract.

## Database (lib/db)

Drizzle ORM + Postgres. Tables: `projects`, `entities`, `rules`, `players`, `notes`, `tasks`, `chat_messages`. All child tables FK to `projects.id` with cascade delete. Push schema with `pnpm --filter @workspace/db run push`.

## API contract (lib/api-spec / lib/api-zod / lib/api-client-react)

OpenAPI 3 spec at `lib/api-spec/openapi.yaml` is the source of truth. Codegen produces:
- `lib/api-zod` — Zod schemas, exported under the `schemas` namespace (e.g. `schemas.CreateProjectBody`).
- `lib/api-client-react` — TanStack Query hooks (`useListProjects`, `useGetDashboardSummary`, etc.). The chat send hook is intentionally NOT used; the chat panel calls fetch directly to consume SSE.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`.

## AI integration

`lib/integrations-anthropic-ai` wraps the Replit-managed Anthropic proxy. No customer-supplied API key needed; auth is handled by the integration env vars. Used in entities/rules generate routes (single-shot JSON) and chat route (streaming).

## Workflows

- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev`
- `artifacts/gameforge: web` — `pnpm --filter @workspace/gameforge run dev` (Vite, port 25201)
- `artifacts/mockup-sandbox: Component Preview Server`

## Recent changes

- Built initial GameForge product end-to-end (DB schema, OpenAPI, all API routes, full IDE-style frontend with persistent chat panel and 6 workspace sections).
- Seeded three sample projects (Embers of Aldoria, Last Light Protocol, Smokestack) with entities, rules, players, notes, tasks, and chat history.
- Expanded to 14 workspace tabs (added Research, Ontology, Assets, Simulator, Playtesting, Balance, Storyboard, Exports), Clerk auth, multi-provider AI routing, image generation, public feedback share links, admin panel.
- Added auth + ownership middleware (`middlewares/projectAuth.ts`): `requireAuth` and `requireProjectAccess` are mounted at the `/projects` route prefix in `routes/index.ts`. Project list filters by `ownerUserId` (admins see all). Dashboard endpoints are auth-protected and per-user scoped.
- Verified ship-readiness with end-to-end browser tests (Clerk login → workspace → simulator/balance/exports/research) and an architect code review; all critical security and contract issues resolved.
- Phase A: Multi-provider AI router (Anthropic / OpenAI / Gemini / OpenRouter for Grok+Perplexity), grouped model dropdown in chat panel and account, Markdown rendering via react-markdown + remark-gfm.
- Phase B: AI Enhance buttons on every item type — rules, players, entities, notes, research, assets, and storyboard. Each enhance route is project-scoped, parses structured JSON output, returns 502 if unusable, and surfaces success/failure toasts in the UI.
- Phase C: Gamma Kickstarter section in Exports with `kickstarter_assets` table; generate / poll / refresh / delete endpoints; Gamma API v1.0 client.
- Phase D: Workspaces (companies) with auto-created "Personal" workspace per user, project slugs, slug-based routes `/:workspaceSlug/:projectSlug`, and a workspace switcher.
- Phase E: Replit-style workspace home with chat-box prompt and game template tiles; "Generate" wizard fills project + entities + rules from one prompt.
- Hotfix (workspace generate 502): bumped maxTokens 3000→8000 and tightened the blueprint prompt so the AI response is unlikely to be truncated; added an iterative truncated-JSON repair pass in `aiRouter.tryParseJsonObject` (shared by every enhance route); added a minimum-viability check on the generated payload (blueprint OR rules OR entities required) plus a fallback project name and a friendlier transient error toast when generation fails.
