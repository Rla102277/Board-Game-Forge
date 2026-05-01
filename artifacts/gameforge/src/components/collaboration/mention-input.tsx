import { Textarea } from "@/components/ui/textarea";

interface MentionableUser {
  userId: string;
  userName: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users?: MentionableUser[];
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  disabled,
}: MentionInputProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export function parseCommentMentions(
  content: string,
): { userIds: string[]; contentWithLinks: string } {
  return { userIds: [], contentWithLinks: content };
}
