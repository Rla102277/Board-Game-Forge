import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "comment" | "mention" | "assignment" | "system";
  title: string;
  message: string;
  projectId?: number;
  projectName?: string;
  userId?: string;
  userName?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/notifications`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${apiBase}/api/notifications/${notificationId}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${apiBase}/api/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${apiBase}/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, [notifications]);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// Simulated notification creator for when backend isn't ready
export function createLocalNotification(
  type: Notification["type"],
  title: string,
  message: string,
  metadata?: Partial<Notification>
): Notification {
  return {
    id: `local-${Date.now()}-${Math.random()}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    ...metadata,
  };
}
