import { Pencil, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EditingUser {
  userId: string;
  userName?: string;
}

interface EditingIndicatorProps {
  users: EditingUser[];
  itemName?: string;
  itemType?: string;
}

export function EditingIndicator({ users, itemName, itemType }: EditingIndicatorProps) {
  if (users.length === 0) return null;
  const names = users.map((u) => u.userName ?? "Someone").join(", ");
  const label = users.length === 1 ? `${names} is editing` : `${names} are editing`;
  return (
    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="font-medium">{label}</span>
      {itemName && <span className="text-muted-foreground">{itemType} “{itemName}”</span>}
    </div>
  );
}

interface EditingBadgeProps {
  isEditing: boolean;
  editorName?: string;
}

export function EditingBadge({ isEditing, editorName }: EditingBadgeProps) {
  if (!isEditing) return null;
  const initial = (editorName?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
      <Pencil className="h-2.5 w-2.5" />
      <span>{editorName ?? "Editing"}</span>
      {editorName && (
        <Avatar className="h-3.5 w-3.5">
          <AvatarFallback className="text-[7px] bg-amber-500/20 text-amber-400">{initial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
