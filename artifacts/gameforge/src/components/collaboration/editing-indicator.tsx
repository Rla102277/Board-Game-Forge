import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";

interface EditingUser {
  id: string;
  name: string;
  avatar?: string;
  editingItem: string;
}

interface EditingIndicatorProps {
  users: EditingUser[];
  itemName: string;
  itemType: string;
}

export function EditingIndicator({ users, itemName, itemType }: EditingIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
      <Edit3 className="h-4 w-4 text-primary" />
      <div className="flex-1">
        <span className="text-sm text-muted-foreground">
          {users.length === 1 ? (
            <>
              <span className="font-medium text-foreground">{users[0].name}</span> is editing this {itemType}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{users.length} users</span> are editing this {itemType}
            </>
          )}
        </span>
      </div>
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
            )}
          </Avatar>
        ))}
        {users.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
            +{users.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditingBadgeProps {
  isEditing: boolean;
  editorName?: string;
}

export function EditingBadge({ isEditing, editorName }: EditingBadgeProps) {
  if (!isEditing) return null;

  return (
    <Badge variant="secondary" className="gap-1">
      <Edit3 className="h-3 w-3" />
      <span className="text-xs">{editorName ? `${editorName} editing` : "Editing"}</span>
    </Badge>
  );
}
