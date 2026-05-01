import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  CheckCheck,
  Trash2,
  AtSign,
  GitCommit,
  X,
} from "lucide-react";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/use-collaboration";
import { formatDistanceToNow } from "date-fns";
import type { NotificationItem } from "@/lib/collaboration-types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync(id);
  };

  const handleMarkAll = async () => {
    await markAll.mutateAsync();
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAll}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItemRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  isMarking={markRead.isPending}
                  isDeleting={del.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="px-4 py-2 text-center">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto py-1">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItemRow({
  notification,
  onMarkRead,
  onDelete,
  isMarking,
  isDeleting,
}: {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isMarking: boolean;
  isDeleting: boolean;
}) {
  const icon = getNotificationIcon(notification.type);
  const initial = (notification.actor?.firstName?.[0] ?? notification.actor?.email?.[0] ?? "?").toUpperCase();

  return (
    <div
      className={`flex gap-3 p-3 transition-colors hover:bg-muted/50 ${
        !notification.read ? "bg-primary/5" : ""
      }`}
    >
      <div className="shrink-0">
        {notification.actor ? (
          <Avatar className="h-8 w-8">
            {notification.actor.imageUrl && <AvatarImage src={notification.actor.imageUrl} alt="" />}
            <AvatarFallback className="text-xs">{initial}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <icon.icon className={`h-4 w-4 ${icon.color}`} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm leading-snug">
              <span className="font-medium">{notification.title}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onMarkRead(notification.id)}
                disabled={isMarking}
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(notification.id)}
              disabled={isDeleting}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "comment":
      return { icon: MessageSquare, color: "text-blue-400" };
    case "mention":
      return { icon: AtSign, color: "text-purple-400" };
    case "assignment":
      return { icon: UserCheck, color: "text-green-400" };
    case "status_change":
      return { icon: GitCommit, color: "text-cyan-400" };
    case "due_soon":
      return { icon: AlertTriangle, color: "text-amber-400" };
    default:
      return { icon: Bell, color: "text-muted-foreground" };
  }
}
