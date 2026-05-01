# GameForge → Monday.com-Style Collaboration Plan

## 1. Current State

| Feature | Status | Location |
|---------|--------|----------|
| Workspace members (invite, roles) | Partial | `members-dialog.tsx` |
| Project sharing | URL copy only | `share-dialog.tsx` |
| Kanban tasks | Basic 3 columns | `tasks.tsx` |
| Task dependencies | UI stub | `task-dependencies.tsx` |
| Comments | Empty stub | `comments-panel.tsx` |
| Activity feed | Empty stub | `activity-feed.tsx` |
| Version history | Empty stub | `version-history.tsx` |
| Presence/cursors | Return null | `cursor-indicators.tsx` |
| Notifications | Polling-only | `use-notifications.ts` |
| AI Chat | Functional | `chat-panel.tsx` |

## 2. Target Feature Set

### A. Sharing & Permissions
- Project-level share with roles (Admin/Editor/Commenter/Viewer)
- Public share links with expiry
- Transfer ownership
- Section/tab-level permissions

### B. User & Team Management
- Expanded roles beyond owner/member
- Sub-teams/groups within workspace
- Member directory with search
- User profiles (bio, timezone, skills)

### C. Task Management (Priority)
- Assignees with avatars
- Due dates, priorities, tags/labels
- Subtasks (nested checklists)
- Time tracking (est/actual)
- Multiple views: Kanban (exists), Table, Calendar, Timeline/Gantt
- Filters & bulk operations
- Automation rules (when→then)

### D. Communication
- Threaded comments on tasks, rules, assets, notes
- @mentions with autocomplete
- Real-time presence ("3 people viewing")
- Live cursors in shared editors
- Team chat (alongside or replacing AI-only chat)

### E. Activity & Audit
- Real activity feed with filtering
- In-app notification bell with dropdown
- Project changelog / undo

## 3. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Backend: add `assigneeId`, `dueDate`, `priority`, `tags`, `parentTaskId` to Task model
- Backend: add Comment, ActivityLog, ProjectShare tables
- Regenerate `api-client-react` from OpenAPI
- Replace stub components with real implementations:
  - `comments-panel.tsx` → full CRUD with threading
  - `activity-feed.tsx` → read from ActivityLog
  - `mention-input.tsx` → @mention autocomplete

### Phase 2: Task Upgrade (Weeks 3-4)
- Rich task cards (assignee, due date, priority badge, tags)
- Task detail drawer (description, subtasks, comments, activity)
- New views: Table, Calendar, Timeline
- View switcher in Tasks component
- Bulk select + bulk actions toolbar

### Phase 3: Sharing & Permissions (Weeks 5-6)
- Overhaul `share-dialog.tsx` with full permission panel
- Hook: `useProjectPermissions()` for UI gating
- Conditionally hide edit buttons for viewers
- Role editing in `members-dialog.tsx`
- New: `workspace-members-directory.tsx`

### Phase 4: Real-Time & Notifications (Weeks 7-8)
- WebSocket or SSE layer: `useRealtimeChannel(projectId)`
- Presence: active users, live cursors
- Notification bell with real backend integration
- Activity feed grouping and filtering

### Phase 5: Polish (Weeks 9-10)
- Dashboard widgets (My Tasks, Team Workload, Overdue)
- Automation builder UI
- Mobile-responsive Kanban
- Export tasks to CSV/ICS

## 4. New Components Needed

```
src/components/collaboration/
  comments-panel.tsx         [OVERHAUL]
  activity-feed.tsx          [OVERHAUL]
  share-dialog.tsx             [OVERHAUL]
  cursor-indicators.tsx        [OVERHAUL]
  mention-input.tsx            [OVERHAUL]
  presence-avatars.tsx         [NEW]
  notification-bell.tsx          [NEW]
  notification-dropdown.tsx      [NEW]
  team-chat-panel.tsx            [NEW]

src/components/workspace/
  tasks.tsx                    [OVERHAUL]
  tasks-table-view.tsx           [NEW]
  tasks-calendar-view.tsx        [NEW]
  tasks-timeline-view.tsx        [NEW]
  task-detail-drawer.tsx         [NEW]
  task-card.tsx                  [NEW]
  task-filters.tsx               [NEW]
  task-bulk-actions.tsx          [NEW]
  members-dialog.tsx             [ENHANCE]
  workspace-members-directory.tsx  [NEW]
  project-permissions-gate.tsx   [NEW]
  dashboard-widgets.tsx          [NEW]

src/hooks/
  use-notifications.ts         [ENHANCE]
  use-realtime.ts                [NEW]
  use-project-permissions.ts     [NEW]
  use-presence.ts                [NEW]
  use-mentions.ts                [NEW]

src/lib/
  permissions.ts                 [NEW]
  activity-logger.ts             [NEW]
```

## 5. Quick Wins (Do First)
1. Wire `comments-panel.tsx` to a real `POST /api/comments` endpoint
2. Add `assigneeId` to Task schema + show avatar on cards
3. Add `dueDate` + `priority` fields with visual badges
4. Hook activity feed into existing CRUD operations
5. Build notification bell UI (even with polling)

## 6. Critical Dependencies
1. Backend schema migration (blocks everything)
2. API client regeneration (blocks frontend work)
3. Permission system (blocks sharing features)
4. Real-time layer (blocks presence/cursors)

## 7. UI Specs

### Share Dialog
```
Share "Project Name"                        X
[ Invite by email                    ] [Invite]

Anyone with the link
[ Can view ▼ ]
[x] Public link active   Expires: [30 days ▼]

People with access
Alice (Owner)                    Admin
Bob                              [Can edit ▼]  [Remove]
guest@example.com                Pending       [Resend]
```

### Rich Task Card
```
[Art] [Urgent]
Design card back artwork
[Alice] [Bob]           📅 May 15
💬 3    🔗 1 blocked    ⏱️ 4h
```

### Activity Feed Item
```
[Alice]  2 min ago
Assigned "Design card back" to Bob
[View task]
```

## 8. Next Steps

Decide which phase to start with. Recommended: begin with Phase 1 backend schema migration + simultaneously implement Quick Win #1 (basic comments) and Quick Win #2 (task assignees) since these require the least backend surface area.
