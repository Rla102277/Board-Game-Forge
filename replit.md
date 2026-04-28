# GameForge

## Overview

GameForge is a Replit-IDE-style SaaS application designed for tabletop board game creation. It provides a structured workspace for managing game components (entities, rules, players, notes, tasks) and integrates a persistent AI co-designer powered by Anthropic Claude. The platform aims to streamline the game design process, from initial concept to playtesting and export.

Key capabilities include:
- A structured environment for managing all aspects of game design.
- AI-powered assistance for generating entities, rules, and conversational design support.
- Project versioning and duplication for iterative design.
- Workspace-based organization with user authentication and access control.
- Integration with external AI providers for diverse co-design capabilities, including image generation.
- Learning resources for game design principles and platform usage.

The project's ambition is to become a comprehensive platform for board game creators, offering robust tools and intelligent assistance to foster creativity and efficiency in game development.

## User Preferences

No explicit user preferences were provided in the original document.

## System Architecture

GameForge is a pnpm workspace monorepo using TypeScript, comprising three main artifacts: `api-server`, `gameforge` (frontend), and `mockup-sandbox`.

**UI/UX Decisions:**
- The frontend (`artifacts/gameforge`) is built with React, Vite, Tailwind v4, and shadcn, utilizing Wouter for routing, TanStack Query for data management, lucide-react for icons, and framer-motion for transitions.
- The UI features a dark, Replit-inspired theme.
- The workspace interface includes a left rail, a section sidebar with count badges, a main content panel, and a persistent right-hand AI chat panel.
- Interactive elements like chips for game types and genres are used for categorization and filtering.
- Visual components like stat cards, project grids, and activity feeds enhance dashboard usability.
- Design elements for workspace tabs (Overview, Rules, Ontology) have been refined to align with user reference shots, introducing features like an "AI Design Advisor" card, categorized rule badges, and collapsible primer cards for entity types.

**Technical Implementations:**
- **Backend (`artifacts/api-server`):** An Express 5 API server supporting REST and Server-Sent Events (SSE). It handles CRUD operations for project components and facilitates AI interactions. Zod schemas generated from an OpenAPI spec are used for request validation.
- **Frontend (`artifacts/gameforge`):** Manages user interaction, data display, and communication with the backend. It includes dedicated pages for the dashboard and individual project workspaces, each with specific components for different sections (overview, entities, rules, players, notes, tasks). Streaming chat responses from the AI are handled via raw `fetch` and `ReadableStream`.
- **Database (`lib/db`):** Uses Drizzle ORM with Postgres. The schema includes tables for `projects`, `entities`, `rules`, `players`, `notes`, `tasks`, `chat_messages`, `project_snapshots`, `workspace_ai_settings`, and `kickstarter_assets`. All child tables are linked to `projects.id` with cascade delete.
- **API Contract:** Defined by an OpenAPI 3 specification (`lib/api-spec/openapi.yaml`). Codegen generates Zod schemas (`lib/api-zod`) and TanStack Query hooks (`lib/api-client-react`).
- **AI Integration (`lib/integrations-anthropic-ai`):** Wraps a Replit-managed Anthropic proxy for AI calls, handling authentication internally. Supports both single-shot JSON generation for entities/rules and streaming for chat.
- **Authentication and Authorization:** Implemented with Clerk auth. Middleware (`middlewares/projectAuth.ts`) enforces `requireAuth` and `requireProjectAccess`, ensuring project list filtering by `ownerUserId` and protecting dashboard endpoints.
- **AI Enhancement Features:** Dedicated routes and UI components for "AI Enhance" buttons on various item types (rules, players, entities, notes, research, assets, storyboard), parsing structured JSON output from AI. Rules and entities both persist `designNotes` plus a flavor field (`edgeCases` for rules, `lore` for entities) populated by AI generate + Apply Rewrite/Apply, and surface them in their expanded views.
- **Multi-provider AI Routing:** Supports multiple AI providers (Anthropic, OpenAI, Gemini, OpenRouter) with a flexible routing mechanism (`aiRouter.complete/stream`) that can utilize workspace-specific API keys (BYOK) stored securely with AES-256-GCM encryption.
- **Image Generation:** Integration with OpenAI for image generation, including retry logic and user-friendly error handling.
- **Project Versioning:** `project_snapshots` table stores JSONB payloads of project state, enabling snapshot creation, restoration, duplication, and forking. A `projectSerializer.ts` handles cross-table ID remapping during these operations.
- **Text Editing with AI:** An `<AiEditTextarea>` component allows users to apply AI-driven text transformations (shorter, longer, rephrase, etc.) to project descriptions, interacting with a dedicated `POST /api/projects/:projectId/ai/text-edit` endpoint.

## External Dependencies

- **Anthropic Claude:** Primary AI co-designer, integrated via a Replit-managed proxy (`lib/integrations-anthropic-ai`).
- **Postgres:** Database system used with Drizzle ORM.
- **Clerk:** Authentication and user management service.
- **OpenAI:** Used for image generation and as an alternative AI provider.
- **Google Gemini:** Supported as an alternative AI provider.
- **OpenRouter:** Integrated to support additional AI models like Grok and Perplexity.
- **Vite:** Frontend build tool.
- **Tailwind CSS v4:** Utility-first CSS framework for styling.
- **shadcn/ui:** UI component library.
- **Wouter:** Lightweight React router.
- **TanStack Query:** Data fetching and caching library for React.
- **lucide-react:** Icon library.
- **framer-motion:** Animation library.
- **react-markdown + remark-gfm:** For Markdown rendering.
- **Gamma API v1.0 Client:** For Kickstarter section integration.