import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useListActivity } from "@/hooks/use-collaboration";
import type { CollaboratorUser, ActivityLogEntry } from "@/lib/collaboration-types";
import { useUser } from "@clerk/react";

// Maps workspace section ids to entity types that appear in activity logs
const SECTION_ENTITY_TYPES: Record<string, string[]> = {
  "assets-entities": ["entity"],
  "rules":           ["rule"],
  "notes":           ["note"],
  "tasks":           ["task"],
  "players":         ["player"],
  "overview":        ["project"],
  "identity":        ["project"],
  "playtesting":     ["playtest"],
  "rulebook":        ["rule", "rulebook"],
  "balance":         ["entity", "rule"],
  "simulator":       ["entity"],
};

const CONFLICT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function initials(u: CollaboratorUser): string {
  if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  if (u.firstName) return u.firstName[0].toUpperCase();
  return (u.email?.[0] ?? "?").toUpperCase();
}

function displayName(u: CollaboratorUser): string {
  if (u.firstName || u.lastName) return [u.firstName, u.lastName].filter(Boolean).join(" ");
  return u.email ?? "Someone";
}

interface ConflictBannerProps {
  projectId: number;
  section: string;
  onDismiss: () => void;
}

export function ConflictBanner({ projectId, section, onDismiss }: ConflictBannerProps) {
  const { user: clerkUser } = useUser();
  const { data: activity = [] } = useListActivity(projectId, 50);

  const relevantTypes = SECTION_ENTITY_TYPES[section] ?? [];

  const recentEditors = useMemo(() => {
    if (relevantTypes.length === 0) return [];
    const cutoff = Date.now() - CONFLICT_WINDOW_MS;

    const seen = new Map<number, ActivityLogEntry>();
    activity.forEach(entry => {
      if (
        relevantTypes.includes(entry.entityType) &&
        new Date(entry.createdAt).getTime() > cutoff &&
        entry.action !== "deleted" &&
        entry.action !== "commented" &&
        String(entry.user.id) !== clerkUser?.id
      ) {
        if (!seen.has(entry.user.id)) {
          seen.set(entry.user.id, entry);
        }
      }
    });

    return [...seen.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [activity, relevantTypes, clerkUser?.id]);

  if (recentEditors.length === 0) return null;

  const first = recentEditors[0];
  const others = recentEditors.length - 1;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Stacked avatars */}
        <div className="flex -space-x-1.5 shrink-0">
          {recentEditors.slice(0, 3).map(e => (
            <Avatar key={e.user.id} className="h-6 w-6 border-2 border-background">
              <AvatarImage src={e.user.imageUrl ?? undefined} />
              <AvatarFallback className="text-[9px] bg-amber-500/20">{initials(e.user)}</AvatarFallback>
            </Avatar>
          ))}
        </div>

        <p className="text-amber-300 leading-snug truncate">
          <span className="font-medium">{displayName(first.user)}</span>
          {others === 1 && (
            <span> and <span className="font-medium">{displayName(recentEditors[1].user)}</span></span>
          )}
          {others > 1 && (
            <span> and <span className="font-medium">{others} others</span></span>
          )}
          {" "}edited{" "}
          {first.entityTitle ? (
            <span className="text-amber-200">"{first.entityTitle}"</span>
          ) : (
            <span>this section</span>
          )}
          {" "}{formatDistanceToNow(new Date(first.createdAt), { addSuffix: true })}
          {" "}— your changes may conflict.
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
