# GameForge

## Overview
GameForge is a SaaS board-game design IDE, a Replit-inspired workspace for tabletop creators. It enables brainstorming, prototyping, simulating, playtesting, and publishing of games. The platform aims to be a comprehensive solution for game designers, offering tools for every stage of the game development lifecycle, from initial concept to final publication.

## User Preferences
I prefer iterative development, with a focus on clear communication and detailed explanations. Please ask before making major architectural changes or introducing new dependencies. I value a modular and maintainable codebase.

## System Architecture
GameForge is a pnpm monorepo with a React + Vite frontend, an Express 5 API server, and a PostgreSQL database utilizing Drizzle ORM. Authentication is managed by Clerk. AI functionalities are provided through a multi-provider routing layer supporting Anthropic Claude, OpenAI GPT, Google Gemini, and OpenRouter, with per-workspace Bring Your Own Key (BYOK) support.

The architecture follows a contract-first API approach, where the OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth for generating Zod validation schemas and TanStack Query hooks.

**Frontend:**
- **Technology:** React 19, Vite, Tailwind CSS v4, shadcn/ui, Wouter, TanStack Query, lucide-react, framer-motion, recharts, react-markdown.
- **UI/UX:** Dark, Replit-inspired theme with a workspace layout featuring a left sidebar rail, section sidebar with badges, main content panel, and a persistent right-hand AI chat panel. Interactive chips, Framer Motion for transitions, and manual display ordering for lists are used.

**Backend:**
- **Technology:** Express 5, Pino logger, Zod validation, Server-Sent Events (SSE) streaming.
- **Authentication & Authorization:** Clerk-based authentication with `@clerk/express` middleware. Middleware chains (`requireAuth`, `requireProjectAccess`, `requireAdmin`) enforce role-based access control.
- **Workspaces:** Top-level containers for projects and team members, supporting personal and shared workspaces, invite links, and per-workspace AI settings (BYOK).
- **Projects:** Each project represents a single board game design, with extensive metadata and JSONB fields, supporting soft-deletion.
- **Versioning:** Project snapshots capture entities, properties, rules, players, notes, tasks, research, assets, playtest sessions, and storyboard nodes. Operations include manual snapshots, auto-snapshots before restores, restore, fork, and duplicate.
- **Collaboration:** Features include project sharing with role-based permissions, real-time presence indicators, notifications, and an activity feed.
- **Core Features:**
    - **Foundation:** Overview dashboard with quick stats, project health, game status, design advisor, design critique, complexity score, and versioning. Game Identity for core metadata and mechanic fingerprint. Research for tracking notes and reference games.
    - **Quick Start Wizard:** A 5-step modal launched from the workspace home (`Quick Start` button next to "Empty project") that collects theme, player count, play time, complexity, and an optional one-line pitch, then creates a workspace-scoped project and fans out **8 parallel population operations** via `Promise.allSettled` so every workspace tab is filled on first load. Lives at `artifacts/gameforge/src/components/wizard/quick-start-wizard.tsx`. The 8 stages are: (1) **Identity** — `updateProject` sets narrative/winCondition/turnPhases/complexityScore/referenceGames; (2) **Entities** AI generation; (3) **Players** AI generation; (4) **Rules** AI generation; (5) **Research** AI generation (`useAiGenerateResearch`); (6) **Reference Games** — 2 curated picks per complexity tier (e.g. Catan + Ticket to Ride for Medium) created via `useCreateReferenceGame`; (7) **Tasks** — 4-6 starter tasks per complexity tier created via `useCreateTask`; (8) **Notes** — a pinned "Quick Start pitch" markdown note. AI failures are tolerated per-stage; deterministic stages (identity, references, tasks, notes) are essentially guaranteed. Workspace-aware: when a `workspaceSlug` prop is provided it uses `workspacesApi.createProject` and lands on `/:workspaceSlug/:projectSlug`; without it falls back to the global `useCreateProject` hook and lands on `/p/:id`. Draft answers persist to `sessionStorage` with type-guarded restore.
    - **Tasks & Tracking:** Full project management system, freeform design notes with AI editing, and structured playtest reports.
    - **Workshop:** Components (Assets & Entities) with 13 core types, properties system, AI generation, bulk editing via Entity Sheet View, Card Studio, Die Face Designer, Variant Manager, Component Bill of Materials (BOM), and Component Graph visualization. Assets include visual/physical assets with AI image generation/variations and print sheet functionality. Player archetypes with AI enhancement and Player Relationship Graph.
    - **Game Pieces UX (Stage 2 entry point):** A dedicated `Game Pieces` overview dashboard sits in front of the existing components list (renamed `All Components`). The dashboard renders 13 type cards (8 Physical: Card, Token, Tile, Board, Meeple, Dice, Standee, Pawn; 5 World: Faction, Location, Resource, Region, Era), each with a status mini-bar, count badge, and CTA. Top row shows production-health KPIs (Total / Approved / Ready / Needs Art) with progress bars, plus rule-based AI suggestions and a 14-day recent-activity feed. Clicking a non-Card type-card opens a right-side `Sheet` containing the appropriate studio: a polymorphic `GenericComponentStudio` (inline-editable status/name/subtype/desc/lore table, AI batch generate with type-aware prompts, stats panel, CSV export, subtype filter tabs, quick-add row), or one of three thin specialized wrappers — `TokenStudio` (adds `Quantity` column + `Seed currency ladder` preset for $1/$5/$10/$20/$50/$100), `TileStudio` (terrain badge column from subtype + `Adjacent to` column + 8-terrain palette hint), `BoardStudio` (parsed `Spaces` column from `stats`/`description` + total-spaces rollup). The Card type-card intentionally routes to `assets-entities` to preserve the existing rich Card/Deck flow with zero regression. Files: `src/components/workspace/game-pieces-overview.tsx`, `generic-component-studio.tsx`, `token-studio.tsx`, `tile-studio.tsx`, `board-studio.tsx`. Wired into `pages/workspace.tsx` Stage 2 as the first item.
    - **Rules & Flow:** Rules management with AI generation/enhancement, structured Rulebook Editor, Turn Structure Visualizer, and Layout Editor.
    - **Simulation:** Monte Carlo simulation, AI Playthroughs, Scaling Matrix Visualizer, Scoring Curve, and Balance scoring with AI reports.
    - **Playtesting:** Playtesting Hub for session logging, public feedback via shareable URLs, and a Playtest Calendar. Blind Playtest Kit for structured blind testing protocols.
    - **Publish:** Text/Data Exports (Tabletop Simulator JSON, Rulebook Markdown, Component BOM CSV, AI-generated marketing materials). Integration with Gamma API for designed PDFs/PPTX (Rulebook, Pitch Deck, One-pager, Art Bible). Cost Estimator.
- **AI Features:**
    - Multi-provider routing for AI services.
    - AI Co-Designer Chat with context-aware persona changes.
    - AI Text Editor for inline transformations.
    - AI Enhance Buttons for structured JSON output and populating design notes.
    - Design Advisor for comprehensive project analysis and recommendations.
    - Design Critique for scoring game design.
    - AI Image Generation and variations.
    - AI Project Generation for full game prototypes from text prompts.
- **Admin Console:** User management and soft-deletion of users.
- **Trash / Recycle Bin:** Soft-deletion and restoration of projects.
- **Onboarding Tour:** Step-by-step guided walkthrough for new users entering a workspace. 20 steps covering all sidebar groups (Foundation, Tasks & Tracking, Workshop, Rules & Flow, Simulation, Playtesting, Publish, Team, AI Chat). Auto-triggers on first visit (800ms delay), persists completion/skip in localStorage (`gameforge:workspace-tour-completed:<projectId>`), accessible dialog with focus trap and ARIA semantics. Re-trigger via "Workspace Tour" button in sidebar footer. Files: `src/components/workspace/workspace-tour.tsx`, `src/hooks/use-workspace-tour.ts`.
- **Learn System:** GameForge Bible (app documentation), Board Game Design 101 (8-lesson course), and an AI Tutor grounded in reference material.

**Database Schema (Core Tables):**
- `app_users`: Clerk-synced user records.
- `workspaces`: Organizational containers.
- `workspace_members`: User-workspace membership.
- `projects`: Game designs with extensive metadata.
- Various other tables for game design elements (entities, rules, players, assets, notes), collaboration (tasks, comments, activity feed), and system functionalities (project snapshots, chat messages, AI settings).

## External Dependencies
- **Clerk:** Authentication and user management.
- **PostgreSQL:** Primary database.
- **Anthropic Claude:** AI provider.
- **OpenAI:** AI provider and image generation.
- **Google Gemini:** AI provider.
- **OpenRouter:** AI provider (Grok, Perplexity).
- **Gamma API:** Designed PDF/PPTX document generation.
- **Vite:** Frontend build tool.
- **Tailwind CSS v4:** Utility-first styling.
- **shadcn/ui:** UI component library.
- **Wouter:** Lightweight React router.
- **TanStack Query:** Data fetching and caching.
- **lucide-react:** Icons.
- **framer-motion:** Animations.
- **recharts:** Charts and data visualization.
- **react-markdown + remark-gfm:** Markdown rendering.