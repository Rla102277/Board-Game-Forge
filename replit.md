# GameForge

## Overview

GameForge is a SaaS board-game design IDE — a Replit-inspired workspace where tabletop creators brainstorm, prototype, simulate, playtest, and publish their games. It is built as a pnpm monorepo with a React + Vite frontend, an Express 5 API server, and a Postgres database (Drizzle ORM). Authentication is handled by Clerk. AI features are powered by a multi-provider routing layer supporting Anthropic Claude, OpenAI GPT, Google Gemini, and OpenRouter (Grok/Perplexity) with per-workspace Bring Your Own Key (BYOK) support.

## System Architecture

```
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          Express 5 API (REST + SSE), port from $PORT, base path /api
│   ├── gameforge/           React + Vite frontend, Tailwind v4, shadcn/ui
│   └── mockup-sandbox/      Vite dev server for isolated component previews
├── lib/
│   ├── api-spec/            OpenAPI 3 spec (openapi.yaml) + Orval codegen config
│   ├── api-zod/             Generated Zod schemas from OpenAPI
│   ├── api-client-react/    Generated TanStack Query hooks from OpenAPI
│   ├── db/                  Drizzle ORM schema, migrations, connection
│   ├── integrations-anthropic-ai/
│   ├── integrations-gemini-ai/
│   ├── integrations-openai-ai-react/
│   ├── integrations-openai-ai-server/
│   ├── integrations-openrouter-ai/
│   └── integrations/openai_ai_integrations/
├── scripts/                 Utility scripts (post-merge, data migrations)
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── tsconfig.json            Solution file for composite libs
```

### Contract-First API

The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth. Running `pnpm --filter @workspace/api-spec run codegen` generates:
- Zod validation schemas in `lib/api-zod/`
- TanStack Query hooks + TypeScript types in `lib/api-client-react/`

The server validates inputs/outputs with Zod schemas; the frontend consumes generated hooks.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, Wouter, TanStack Query, lucide-react, framer-motion, recharts, react-markdown |
| Backend | Express 5, Pino logger, Zod validation, SSE streaming |
| Database | PostgreSQL, Drizzle ORM |
| Auth | Clerk (PKCE, JWT middleware) |
| AI | Anthropic Claude, OpenAI GPT, Google Gemini, OpenRouter (multi-provider routing) |
| Exports | Gamma API (designed PDFs/decks), browser canvas rasterization (print sheets) |

### Logging

Server code uses `req.log` in route handlers and the singleton `logger` for non-request code. Never `console.log`.

---

## Authentication & Authorization

### Clerk Auth
- Frontend wrapped in `<ClerkProvider>`. Protected routes use `<Show when="signed-in">`.
- Backend uses `@clerk/express` middleware. A global middleware auto-upserts Clerk users into `app_users` table on every request.
- `ClerkQueryClientCacheInvalidator` clears TanStack Query cache on sign-out to prevent data leakage.

### Middleware Chain
- `requireAuth` — extracts Clerk `userId`, attaches local `appUserId` and `appUserRole` to `req`.
- `requireProjectAccess` — checks `project_shares` and `workspace_members` tables for role-based access (admin, editor, commenter, viewer).
- `requireAdmin` — guards admin-only routes by checking user role in DB.

---

## Workspaces

Workspaces are the top-level organizational container for projects and team members.

- **Personal Workspaces**: Auto-created per user on first access. Cannot be deleted. Orphan projects are auto-migrated into them.
- **Shared Workspaces**: Created manually with a name and unique slug. Support multiple members with roles (owner, admin, member, viewer).
- **Invite Links**: 12-byte hex invite codes. `GET /workspaces/join/:code` previews workspace info; `POST` joins. Owners can regenerate codes.
- **AI Settings (BYOK)**: Per-workspace configuration for AI providers. API keys encrypted with AES-256-GCM using `SESSION_SECRET`. Admins toggle providers and enter custom keys via `AiProvidersDialog`.
- **AI Project Generation**: `POST /workspaces/:slug/generate` creates a complete game prototype (entities, rules, players) from a text prompt.
- **Templates**: One-click generation from presets (Strategy, Party, Cooperative, Deck-builder, etc.).

---

## Projects

Each project represents a single board game design within a workspace. Key metadata fields:

`name`, `description`, `gameType`, `genre`, `playerCount`, `targetDuration`, `complexityScore`, `winCondition`, `turnPhases`, `eliminationRule`, `designPhase`, `narrative`, `blueprint`

JSONB fields: `overviewMeta`, `designProblems`, `nextPlaytest`, `decisionLog`, `mechanicFingerprint`

Soft-delete via `deletedAt` column (trash/recycle bin system).

---

## Workspace Tabs & Features

The workspace is organized into navigation groups, each containing specialized tabs:

### Foundation

#### Overview (Game Dashboard)
- **Quick Stats Row**: Entity count, rule count, player count, playtest count with progress percentages.
- **Project Health Card**: Radar chart (Balance, Clarity, Engagement, Innovation, Completeness).
- **Game Status Widget**: Balance score, blocker/concern counts, next recommended step, schedule-playtest action.
- **Design Advisor Button**: AI-powered full-project analysis (see AI Features below).
- **Where You Left Off**: Recent items across all tabs for quick resumption.
- **Design Critique**: AI scoring on 5 axes with letter grades.
- **Complexity Score**: Breakdown of cognitive load and mechanical depth.
- **Project Versions**: Snapshot creation, restore, fork, duplicate.
- **Collaboration Dashboard**: Activity feed, member presence, share controls.

#### Game Identity
- Edit core project metadata: name, description, game type, genre, player count, duration, win condition, turn phases, elimination rules, narrative.
- **Mechanic Fingerprint**: 5-axis visualization (Luck, Strategy, Interaction, Complexity, Theme).
- **Design Brief Header**: Sticky bar showing key identity fields + fingerprint dots, collapsible with localStorage persistence.

#### Research
- Research items with notes and sources.
- **Reference Games**: Track what to borrow and avoid from existing games. Linked to research items.

### Tasks & Tracking

#### Tasks
- Full project management system (Monday.com/Jira-style).
- Assignees, subtasks (checklists), dependencies (blocking/blocked), tags (JSONB), priority, category, estimated/actual hours, due dates.
- Task detail drawer opens on row click.
- Filters by status, priority, assignee, category.

#### Notes
- Freeform design notes with title and rich content.
- AI text editing capabilities (shorter, longer, rephrase, vivid, punchy, formal).

#### Playtest Reports
- Structured reports: attendees, rating (1-5), what worked, what broke.
- Action items that convert directly into project Tasks with one click.

### Workshop

#### Components (Assets & Entities)
The primary design workspace for game components. Sub-features:

**Entities (Game Components)**
- 13 core types: Card, Deck, Token, Die, Tile, Meeple, Board, Zone, Location, Faction, Event, Resource, Ability.
- Each type has subtypes (e.g., Card -> Action, Item, Spell; Die -> Action Die, Combat Die).
- Properties system: key-value pairs with data type, unit, min/max/default values.
- Entity templates with tiered stat ranges (Tier 1 Beginner through Tier 5 Boss).
- AI generation: `/ai-generate` endpoint creates distinct components from prompts using the strict 13-type schema.
- Lore and design notes fields populated by AI enhance + Apply workflow.
- `relatedTo` links for explicit component relationships.
- `displayOrder` for manual sorting.

**Entity Sheet View**
- Spreadsheet-like bulk editing interface.
- CSV import/export.
- Deck management: nested view for cards within a deck.
- In-line AI batch generation for decks.

**Card Studio**
- Dedicated deck management interface.
- Batch AI generation with subtype-specific logic.
- Distribution statistics for deck composition.

**Die Face Designer**
- Custom 6-sided die editor.
- Faces stored as entity properties (`face_1` through `face_6`).
- Quick emoji picker.
- Probability distribution chart.

**Variant Manager**
- Models collections with color/type variations (e.g., "Red x20, Blue x20").
- Uses `variant_` property prefix system.
- Quantity tracking and percentage share calculation.

**Component BOM (Bill of Materials)**
- Aggregates all entities/assets into a manufacturing list.
- Classifies as Physical, Conceptual, or Digital.
- CSV export for production planning.

**Component Graph**
- Radial visualization of game architecture.
- Explicit links (manual `relatedTo`), inferred links (AI-detected co-references in rules), and coverage gaps (orphan components, abstract rules).
- Multi-hop highlighting (color-coded depth 1-3).
- Positions persisted via `graph_layouts` table.

**Assets**
- Visual/physical assets linked to entities.
- Fields: name, kind, description, flavorText, imageDataUrl, imagePrompt, quantity, status (draft/ready/final), componentDetails.
- **Multi-component linking**: `asset_entity_links` join table for M:N asset-entity relationships. Chip picker UI in ComponentInspector.
- **Asset versioning**: `asset_versions` table. Snapshot dialog, restore, delete, download.
- **AI image generation**: OpenAI integration with retry logic.
- **AI image variations**: Generate 1-4 candidates without writing; pick one to commit.
- **Print Sheet**: Letter/A4, card presets (Poker/Bridge/Tarot/Mini/Square/Custom), 150/300/600 DPI, real canvas rasterization, configurable bleed/cut-lines, respect-quantity toggle.

#### Players
- Player archetypes with: name, role, strategy, archetype, faction, motivation, flaw, arc.
- Behavior profile (JSONB) and relationships (JSONB).
- Display ordering.
- AI enhance for player profiles.
- **Player Relationship Graph**: Visual network of inter-player dynamics.

### Rules & Flow

#### Rules
- Title, content, category, priority, section, display order.
- Design notes and edge cases fields (populated by AI enhance).
- Category badges and collapsible sections.
- AI generation and enhancement.

#### Rulebook
- `RulebookEditor` — structured multi-section rulebook.
- "Sync from project" auto-generates rulebook content from rules/entities/players.
- Persisted as `designer_artifacts` kind `rulebook`.

#### Turn Structure
- `TurnStructureVisualizer` — visual editor for phases, steps, and turn flow.
- Persisted as `designer_artifacts` kind `turn-structure`.

#### Layout
- `LayoutEditor` — visual editor for component positioning on boards/play areas.
- Persisted as `designer_artifacts` kind `layout`.

### Simulation

#### Simulator
- **Monte Carlo Simulation**: 1000-5000 iterations, configurable turns, resource economy modeling (base, income, upkeep, randomness).
- Outputs: health score (0-100), bankrupt rate, mean final, turn-by-turn quantiles (P10/P50/P90).
- **AI Playthroughs**: LLM-narrated 6-8 turn dramatized walkthrough between player archetypes with designer notes.
- `SimulationChart` component for visualization.

#### Scaling Matrix
- `ScalingMatrixVisualizer` — configure balance for different player counts.
- Persisted as `designer_artifacts` kind `scaling`.

#### Scoring Curve
- `ScoringCurve` — visualize point distribution and progression over game time.
- Persisted as `designer_artifacts` kind `scoring-curve`.

#### Balance
- **Balance Score**: Starts at 80, penalized by stat spread (>1.5x variance = -8) and duplicate rule titles (-5).
- Verdict labels (Well balanced, Needs attention, etc.).
- **Stat Explorer**: Scatter plot using recharts to identify outliers.
- **AI Balance Report**: Summary metrics and recommendations.
- **Power Curve**: Entity strength progression visualization.

### Playtesting

#### Playtesting Hub
- **Session Logging**: Player count, duration, rating, notes (positives, issues, suggestions).
- **Public Feedback**: Shareable tokenized URL (`/feedback/:token`). Token = SHA-256 hash of project ID. Anonymous or named submissions with fun/balance/clarity scores.
- **Playtest Calendar**: Schedule upcoming sessions, view past ones.

#### Blind Playtest Kit
- Protocol toggle, rulebook version tracking, instructions.
- Comprehension checks: questions for players to answer after reading rules.
- Friction logging: timestamped, categorized by section, rated by severity.
- Aggregate analysis: average comprehension, completion rates, clarity ratings.
- Persisted as `designer_artifacts` kind `blind-playtest`.

### Publish

#### Exports
**Text/Data Exports** (server-generated):
- Tabletop Simulator JSON (`.json`) for digital prototyping.
- Rulebook Markdown (`.md`).
- Player Aid (2-sided quick-reference).
- Component BOM CSV.
- Kickstarter Campaign Page (AI-generated markdown).
- Publisher Sell Sheet (AI-generated).
- Press Kit (AI-generated).

**Gamma API Integration** (designed documents):
- Designed Rulebook: 14-page PDF with hierarchical sections and AI illustrations.
- Pitch Deck: 12-slide 16:9 presentation.
- One-pager: Professional sell sheet with art.
- Art Bible: Visual style guide with character/component concept art.
- Server builds a detailed brief from project data, sends to Gamma API. Frontend polls for completion, provides links to hosted document/PDF/PPTX.

**Cost Estimator**:
- Manufacturing cost breakdown: materials, per-unit, margins, total run costs.
- Persisted as `designer_artifacts` kind `cost-estimator`.

### Team

#### Comments
- Multi-entity threading: attach comments to notes, tasks, rules, entities, etc.
- @mention support via `MentionInput`.
- Resolved/unresolved state.

#### Activity Feed
- Tracks all changes across the project.
- Action, entity type, entity name, description, metadata.
- Logged automatically on mutations via `logChange` utility.

#### Members
- `MembersDirectory` and `MembersDialog` for workspace/project member management.
- Role-based permissions (admin, editor, commenter, viewer).

---

## AI Features

### Multi-Provider Routing (`aiRouter.ts`)
- **Providers**: Anthropic (Claude Sonnet 4), OpenAI (GPT 5.4), Google Gemini (3.1 Pro), OpenRouter (Grok 4 Fast).
- `complete()` — one-shot structured/narrative tasks.
- `stream()` — real-time SSE chat.
- `pickProvider()` — dynamic selection based on task kind (narrative vs. structured) and user preferences.
- `resolveClients()` — injects workspace-specific BYOK API keys.
- JSON utilities: `tryParseJsonObject`, `repairTruncatedJsonObject` for robust AI output parsing.
- Keys encrypted at rest with AES-256-GCM using `SESSION_SECRET`.
- `AiProviderDisabledError` → 503 responses.

### AI Co-Designer Chat
- `POST /projects/:projectId/chat/send` (SSE streaming).
- Context-aware persona changes by active tab (e.g., "AI Game Architect" for Overview, "Rules Editor" for Rules, "Art Director" for Assets).
- `ChatPanel` component with streaming response rendering.
- Chat history persisted in `chat_messages` table.

### AI Text Editor
- `AiEditTextarea` component for inline text transformations.
- Actions: shorter, longer, rephrase, vivid, punchy, formal.
- `POST /projects/:projectId/ai/text-edit` endpoint.

### AI Enhance Buttons
- Dedicated routes for rule, player, entity, note, research, asset, and storyboard enhancement.
- Parses structured JSON output from AI.
- Populates `designNotes` + flavor fields (`edgeCases` for rules, `lore` for entities).
- Apply Rewrite / Apply workflow in expanded views.

### Design Advisor
- `POST /projects/:projectId/design-advisor`.
- Reads entire project data (rules, entities, players, playtests, feedback, balance, changelog, assets, notes, reference games).
- Computes balance score, builds comprehensive context string, sends to AI.
- Returns structured analysis: strengths[], issues[] (priority, estimated hours, suggested tab), recommendations[] (priority-ranked, hours, tab links), nextMilestone (name, requirements checklist, progress percentage).
- `DesignAdvisorButton` component with Dialog modal — loading/error/success states, re-analyze button.

### Design Critique
- Scores game design on 5 axes: balance, clarity, engagement, innovation, completeness.
- Letter grade presentation.

### AI Image Generation
- OpenAI integration for asset images.
- Retry logic and user-friendly error handling.
- Variation generation: produce 1-4 candidates, pick one to commit.

### AI Project Generation
- Full game prototype from a text prompt (entities, rules, players).
- Available from workspace home via prominent text input.

---

## Project Versioning

### Snapshots
- `projectSnapshots` table with JSONB `payload`.
- **Captured**: Entities, properties, rules, players, notes, tasks, research, assets, playtest sessions, storyboard nodes.
- **Excluded**: Chat messages (ephemeral), playtest feedback (external), changelog (append-only), kickstarter assets (external IDs).
- `projectSerializer.ts` handles serialization with ID stripping and cross-table ID remapping on restore.

### Operations
- **Snapshot**: Manual named snapshots of current state.
- **Auto-Snapshot**: Created automatically before any restore (undo safety net).
- **Restore**: Transaction — auto-snapshot current state, clear all data, apply payload.
- **Fork**: New project from a specific snapshot (tracks `forkedFromProjectId`/`forkedFromSnapshotId`).
- **Duplicate**: New project from current live state.

---

## Collaboration

- **Project Sharing**: Invite by email, role assignment (admin/editor/commenter/viewer). Public link toggle for "anyone with the link" access.
- **Real-time Presence**: `PresenceAvatars`, `CursorIndicators`, `ItemPresence`, `EditingIndicator`.
- **Notifications**: Bell icon, user-specific alerts for comments, mentions, assignments.
- **Activity Logging**: `logChange` utility records all mutations to `changelogEntries` and `activity_feed`.

---

## Admin Console

- `GET /admin/users` — list all users with project counts.
- `PATCH /admin/users/:userId` — change user roles.
- `DELETE /admin/users/:userId` — soft-delete users.
- `requireAdmin` middleware guards admin routes.
- Frontend auto-redirects non-admin users.

---

## Trash / Recycle Bin

- `DELETE /projects/:id` sets `deletedAt` (soft delete).
- `GET /trash/projects` — admins see all; users see their own.
- `POST /projects/:id/restore` — clears `deletedAt`.
- `DELETE /projects/:id/purge` — hard delete (only if already trashed).

---

## Learn System

### GameForge Bible (App Documentation)
- Guided tour of all IDE features using a "Monopoly" worked example.
- Chapters: Welcome, Entities & Ontology, Workshop, Card Studio, Die Face Designer, Rules & Rulebook, Simulator & Balance, Publish & Exports.

### Board Game Design 101 (8-Lesson Course)
1. What is a board game, really? (Magic circle, decisions vs. outcomes)
2. Goals & Win Conditions (Victory paths, kingmaking prevention)
3. Core Mechanics (Worker placement, deck-building, area control)
4. Components & Physical Design (Tactile UI, information hierarchy)
5. Balance & Probability (Expected value, cost-to-impact ratios)
6. Iteration & Playtesting (Blind testing, observation sheets, triage)
7. Theme & Narrative Integration (Pasted-on vs. mechanically integrated)
8. Publishing & Market (Self-publishing, licensing, print-and-play)

Each lesson: Intro, Core Concepts, Real-world Examples, Deep Dive, Pitfalls, Exercise.

### AI Tutor
- `POST /api/learn/chat` — specialized "GameForge Tutor" persona grounded in reference material.
- `LearnChat` component with starter questions and per-lesson chat history.

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing / HomeRedirect | Marketing page or redirect to workspace |
| `/sign-in`, `/sign-up` | Clerk auth pages | |
| `/feedback/:token` | PublicFeedback | Anonymous playtest feedback form |
| `/join/:code` | JoinWorkspace | Workspace invite acceptance |
| `/account` | Account | Profile, AI model selection, admin link |
| `/learn` | LearnPage | Bible + Design 101 + AI tutor |
| `/admin` | Admin | User management console |
| `/:workspaceSlug` | WorkspaceHome | Workspace dashboard, project grid, AI generation |
| `/:workspaceSlug/:projectSlug` | Workspace | Full project IDE |
| `/p/:projectId` | Workspace (legacy) | Direct project access |

---

## Database Schema

### Core Tables
- `app_users` — Clerk-synced user records (id, clerkUserId, email, name, imageUrl, role)
- `workspaces` — organizational containers (slug, name, ownerUserId, isPersonal, inviteCode)
- `workspace_members` — user-workspace membership (role, status, invitedEmail)
- `projects` — game designs (extensive metadata + JSONB fields, soft-delete)

### Game Design Tables
- `entities` — game components (13 types, subtypes, stats, lore, designNotes, displayOrder)
- `entity_properties` — key-value numeric/text properties per entity
- `rules` — game rules (title, content, category, priority, section, designNotes, edgeCases)
- `players` — player archetypes (role, strategy, archetype, faction, motivation, flaw, arc, behaviorProfile, relationships)
- `assets` — visual/physical assets (kind, imageDataUrl, imagePrompt, quantity, status, componentDetails)
- `asset_entity_links` — M:N asset-entity relationships
- `asset_versions` — manual asset version history
- `notes` — freeform design notes
- `research_items` — research and inspiration
- `reference_games` — competitor analysis (borrowing, avoiding)
- `storyboard_nodes` — narrative planning nodes

### Collaboration Tables
- `tasks` — project management (status, priority, tags JSONB, estimatedHours, actualHours, dueDate)
- `task_assignees`, `task_subtasks`, `task_dependencies` — task relationships
- `comments` — multi-entity threaded comments (parentId, resolved)
- `activity_feed` — change audit trail
- `project_shares` — role-based project sharing
- `notifications` — user alerts
- `changelog_entries` — append-only change log

### System Tables
- `project_snapshots` — versioning payloads (JSONB)
- `chat_messages` — AI chat history
- `workspace_ai_settings` — per-workspace AI provider config
- `ai_provider_settings` — per-user AI preferences
- `graph_layouts` — component graph node positions (JSONB)
- `designer_artifacts` — per-project per-kind JSONB storage (rulebook, turn-structure, blind-playtest, scaling, layout, cost-estimator, scoring-curve, card-templates, graph-layout)
- `entity_rules` — rule-entity junction table
- `kickstarter_assets` — Gamma API generation tracking
- `playtest_sessions` — session logs
- `playtest_feedback` — public feedback submissions
- `playtest_reports` — structured reports with action items

---

## API Routes

### Public (No Auth)
- `healthRouter` — `/healthz`
- `publicFeedbackRouter` — `/feedback/:token`

### Authenticated (No Project Scope)
- `meRouter` — `/me`
- `adminRouter` — `/admin/*` (requireAdmin)
- `dashboardRouter` — `/dashboard`
- `workspacesRouter` — `/workspaces/*` (custom auth with join bypass)
- `learnRouter` — `/learn/*`
- `notificationsRouter` — `/notifications`

### Project-Scoped (requireAuth + requireProjectAccess)
All under `/projects/:projectId/`:
- `projectsRouter` — CRUD, duplicate
- `entitiesRouter` — entities CRUD, AI generate
- `propertiesRouter` — entity properties CRUD
- `rulesRouter` — rules CRUD, AI enhance
- `playersRouter` — players CRUD, AI enhance
- `notesRouter` — notes CRUD
- `tasksRouter` — tasks CRUD with assignees, subtasks, dependencies
- `chatRouter` — AI chat (SSE streaming)
- `assetsRouter` — assets CRUD, image generation, variations, versioning, links
- `simulatorRouter` — Monte Carlo simulation, AI playthroughs
- `playtestRouter` — session CRUD, feedback
- `storyboardRouter` — storyboard nodes, AI enhance
- `balanceRouter` — balance scoring, AI report
- `changelogRouter` — changelog entries
- `exportsRouter` — text/data exports
- `blueprintRouter` — project blueprints
- `kickstarterRouter` — Gamma API integration
- `aiTextRouter` — AI text editing
- `snapshotsRouter` — versioning (snapshot, restore, fork)
- `collaborationRouter` — collaboration features
- `sharesRouter` — project sharing
- `researchRouter` — research items
- `graphLayoutRouter` — component graph positions
- `playtestReportsRouter` — structured playtest reports
- `designerArtifactsRouter` — per-kind JSONB artifacts (9 kinds)
- `trashRouter` — soft-delete, restore, purge
- `analysisRouter` — Design Advisor AI analysis

---

## Designer Artifacts (Persisted Tool State)

Generic per-project JSONB storage via `PUT/GET /projects/:projectId/artifacts/:kind`:

| Kind | Frontend Component | Purpose |
|---|---|---|
| `rulebook` | RulebookEditor | Structured multi-section rulebook |
| `turn-structure` | TurnStructureVisualizer | Phase/step/turn flow editor |
| `blind-playtest` | BlindPlaytestFramework | Blind testing protocol |
| `scaling` | ScalingMatrixVisualizer | Player-count balance config |
| `layout` | LayoutEditor | Component positioning |
| `cost-estimator` | CostEstimator (in Exports) | Manufacturing cost breakdown |
| `scoring-curve` | ScoringCurve | Point distribution visualization |
| `card-templates` | CardStudio | Card deck management |
| `graph-layout` | ComponentGraph | Node position persistence |

---

## External Dependencies

| Dependency | Purpose |
|---|---|
| Clerk | Authentication, user management |
| PostgreSQL | Primary database (Drizzle ORM) |
| Anthropic Claude | Primary AI provider |
| OpenAI | AI provider + image generation |
| Google Gemini | AI provider |
| OpenRouter | AI provider (Grok, Perplexity) |
| Gamma API | Designed PDF/PPTX document generation |
| Vite | Frontend build tool |
| Tailwind CSS v4 | Utility-first styling |
| shadcn/ui | UI component library |
| Wouter | Lightweight React router |
| TanStack Query | Data fetching/caching |
| lucide-react | Icons |
| framer-motion | Animations |
| recharts | Charts and data visualization |
| react-markdown + remark-gfm | Markdown rendering |

---

## UI/UX Conventions

- Dark, Replit-inspired theme throughout.
- Workspace layout: left sidebar rail, section sidebar with count badges, main content panel, persistent right-hand AI chat panel.
- Interactive chips for game types, genres, mechanics.
- Framer Motion for transitions and collapsible sections.
- `@page margin: 0` + internal padding for print sheets.
- Design Brief Header: sticky bar with identity summary, collapsible (localStorage persistence), hydration-safe, mobile-responsive.
- All lists support manual display ordering.
- Empty states with helpful guidance text.

---

## Environment Secrets

| Secret | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Master key for AES-256-GCM API key encryption |
| `GAMMA_API_KEY` | Gamma API for designed document generation |

---

## Key Commands

```bash
pnpm --filter @workspace/api-spec run codegen    # Regenerate Zod + hooks from OpenAPI
pnpm run typecheck                                # Full typecheck (libs + artifacts)
pnpm run typecheck:libs                           # Build composite libs only
pnpm --filter @workspace/api-server run test      # Run API server tests (vitest)
pnpm --filter @workspace/api-server run build     # Build API server bundle
```
