interface EditingUser {
  userId: string;
  userName?: string;
}

interface EditingIndicatorProps {
  users: EditingUser[];
  itemName?: string;
  itemType?: string;
}

export function EditingIndicator(_props: EditingIndicatorProps) {
  return null;
}

interface EditingBadgeProps {
  isEditing: boolean;
  editorName?: string;
}

export function EditingBadge(_props: EditingBadgeProps) {
  return null;
}
