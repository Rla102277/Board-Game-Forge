import { useState, useRef, useEffect } from "react";
import { X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  maxTags?: number;
  disabled?: boolean;
}

export function TagInput({ tags, onChange, placeholder = "Add tag...", suggestions = [], maxTags, disabled }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || tags.includes(trimmedTag)) return;
    if (maxTags && tags.length >= maxTags) return;
    
    onChange([...tags, trimmedTag]);
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    if (inputValue) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {tag}
            {!disabled && (
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (!maxTags || tags.length < maxTags) && (
          <div className="relative flex-1 min-w-[150px]">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value) {
                  setShowSuggestions(true);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              disabled={disabled}
              className="h-8"
            />
            
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {maxTags && (
        <p className="text-xs text-muted-foreground">
          {tags.length} / {maxTags} tags
        </p>
      )}
    </div>
  );
}

export function TagCloud({ tags, onTagClick, activeTags = [] }: { 
  tags: string[]; 
  onTagClick?: (tag: string) => void;
  activeTags?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isActive = activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onTagClick?.(tag)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
