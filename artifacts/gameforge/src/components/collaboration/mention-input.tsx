import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface MentionableUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users?: MentionableUser[];
  disabled?: boolean;
  rows?: number;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  users = [],
  disabled,
  rows = 3,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [cursorIndex, setCursorIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const matches = users.filter((u) =>
    u.userName.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [matches.length]);

  const getMentionContext = useCallback((text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) return null;
    const afterAt = before.slice(atIdx + 1);
    if (afterAt.includes(" ") || afterAt.includes("\n")) return null;
    return { start: atIdx, query: afterAt };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;
    onChange(newValue);

    const ctx = getMentionContext(newValue, cursor);
    if (ctx) {
      setQuery(ctx.query);
      setCursorIndex(cursor);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = (user: MentionableUser) => {
    const ctx = getMentionContext(value, cursorIndex);
    if (!ctx) return;
    const before = value.slice(0, ctx.start);
    const after = value.slice(cursorIndex);
    const newValue = `${before}@${user.userName} ${after}`;
    onChange(newValue);
    setShowDropdown(false);
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = before.length + user.userName.length + 2;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(matches[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="resize-none"
      />
      {showDropdown && matches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover p-1 shadow-md text-sm">
          {matches.map((u, i) => {
            const initial = (u.userName[0] ?? "?").toUpperCase();
            return (
              <button
                key={u.userId}
                type="button"
                className={`w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent ${
                  i === selectedIndex ? "bg-accent" : ""
                }`}
                onClick={() => insertMention(u)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Avatar className="h-5 w-5">
                  {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.userName} />}
                  <AvatarFallback className="text-[9px]">{initial}</AvatarFallback>
                </Avatar>
                <span className="truncate">{u.userName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function parseCommentMentions(
  content: string,
): { userIds: string[]; contentWithLinks: string } {
  const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
  const userIds: string[] = [];
  const contentWithLinks = content.replace(mentionRegex, (match, name) => {
    return `<span class="text-primary font-medium">${match}</span>`;
  });
  return { userIds, contentWithLinks };
}
