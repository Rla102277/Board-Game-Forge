interface PresenceUser {
  userId: string;
  userName?: string;
}

interface ItemPresenceProps {
  itemType: string;
  itemId: string | number;
  users: PresenceUser[];
  className?: string;
}

export function ItemPresence(_props: ItemPresenceProps) {
  return null;
}

interface ItemPresenceBadgeProps {
  users: PresenceUser[];
  showCount?: boolean;
}

export function ItemPresenceBadge(_props: ItemPresenceBadgeProps) {
  return null;
}
