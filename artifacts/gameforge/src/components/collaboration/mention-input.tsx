import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AtSign } from "lucide-react";
import { useUser } from "@clerk/react";

interface MentionableUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users: MentionableUser[];
  disabled?: boolean;
}

export function MentionInput({ value, onChange, placeholder, users, disabled }: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@" && !disabled) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        setMentionStart(start);
        setMentionQuery("");
        setShowMentions(true);
      }
    }
    
    if (e.key === "Escape" && showMentions) {
      setShowMentions(false);
      setMentionStart(null);
    }
    
    if (e.key === "ArrowDown" && showMentions) {
      e.preventDefault();
      // Navigate down in mention list
    }
    
    if (e.key === "ArrowUp" && showMentions) {
      e.preventDefault();
      // Navigate up in mention list
    }
    
    if (e.key === "Enter" && showMentions) {
      e.preventDefault();
      // Select first mention
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Update mention query if we're in a mention
    if (mentionStart !== null && showMentions) {
      const textSinceMention = newValue.slice(mentionStart);
      const match = textSinceMention.match(/^@(\w*)$/);
      if (match) {
        setMentionQuery(match[1]);
      } else {
        setShowMentions(false);
        setMentionStart(null);
      }
    }
  };

  const insertMention = (userId: string, userName: string) => {
    if (mentionStart === null) return;
    
    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(mentionStart + mentionQuery.length + 1);
    const mentionText = `@${userName}`;
    
    onChange(`${beforeMention}${mentionText} ${afterMention}`);
    setShowMentions(false);
    setMentionStart(null);
    setMentionQuery("");
    
    // Focus textarea and move cursor after mention
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = mentionStart + mentionText.length + 1;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const parseMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  return (
    <div className="relative">
      <Popover open={showMentions} onOpenChange={setShowMentions}>
        <PopoverTrigger asChild>
          <div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Mention someone</p>
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No users found</p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => insertMention(u.id, u.name)}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-left"
                >
                  <Avatar className="h-6 w-6">
                    {u.avatar && <AvatarImage src={u.avatar} alt="" />}
                    <AvatarFallback className="text-[10px]">{u.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Mentioned users preview */}
      {parseMentions(value).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {parseMentions(value).map((mention, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              <AtSign className="h-3 w-3" />
              {mention}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function parseCommentMentions(content: string): { userIds: string[]; contentWithLinks: string } {
  const mentionRegex = /@(\w+)/g;
  const userIds: string[] = [];
  let contentWithLinks = content;
  
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    userIds.push(match[1]);
    contentWithLinks = contentWithLinks.replace(
      match[0],
      `<span class="text-primary font-medium">${match[0]}</span>`
    );
  }
  
  return { userIds, contentWithLinks };
}
