import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit3 } from "lucide-react";

interface EditingUser {
  id: string;
  name: string;
  avatar?: string;
  editingItem: string;
}

import { useEditingUsers } from "../../lib/collaboration";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

import { useEditingUsers } from "../../lib/collaboration";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface EditingIndicatorProps {
  users: EditingUser[];
  itemName: string;
  itemType: string;
}

export function EditingIndicator({ users, itemName, itemType }: EditingIndicatorProps) {
  const editingUsers = useEditingUsers();

  const relevantUsers = editingUsers.filter(
    (u) => u.itemId === itemName && u.itemType === itemType
  );

  if (relevantUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <div className="flex -space-x-2">
        {relevantUsers.slice(0, 3).map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={`/avatars/${user.userId}`} />
                  <AvatarFallback className="text-[10px]">
                    {user.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.userName || "Unknown"} is editing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {relevantUsers.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{relevantUsers.length - 3} more
        </span>
      )}
      <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
        Editing...
      </span>
    </div>
  );
}

export function EditingIndicator({ users, itemName, itemType }: EditingIndicatorProps) {
  const editingUsers = useEditingUsers();

  const relevantUsers = editingUsers.filter(
    (u) => u.itemId === itemName && u.itemType === itemType
  );

  if (relevantUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
      <div className="flex -space-x-2">
        {relevantUsers.slice(0, 3).map((user) => (
          <TooltipProvider key={user.userId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={`/avatars/${user.userId}`} />
                  <AvatarFallback className="text-[10px]">
                    {user.userName?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.userName || "Unknown"} is editing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      {relevantUsers.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{relevantUsers.length - 3} more
        </span>
      )}
      <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
        Editing...
      </span>
    </div>
  );
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
