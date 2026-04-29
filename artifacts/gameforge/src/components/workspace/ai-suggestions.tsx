import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface AiSuggestionProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect: (suggestion: string) => void;
  context?: string;
  disabled?: boolean;
}

export function AiSuggestions({ value, onChange, onSuggestionSelect, context, disabled }: AiSuggestionProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedValue = useDebounce(value, 500);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (debouncedValue.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Simulate AI suggestions (in real implementation, call AI API)
    setLoading(true);
    const mockSuggestions = generateMockSuggestions(debouncedValue, context);
    
    setTimeout(() => {
      setSuggestions(mockSuggestions);
      setLoading(false);
      if (mockSuggestions.length > 0) {
        setIsOpen(true);
      }
    }, 300);
  }, [debouncedValue, context]);

  const generateMockSuggestions = (input: string, ctx?: string): string[] => {
    const gameTerms = [
      "attack", "defense", "movement", "resource", "victory", "turn", "round", "phase",
      "player", "faction", "entity", "card", "deck", "hand", "board", "tile",
      "score", "points", "currency", "gold", "mana", "energy", "action", "ability",
      "skill", "power", "effect", "trigger", "condition", "requirement", "cost",
      "bonus", "penalty", "modifier", "multiplier", "threshold", "limit", "cap",
    ];

    const inputLower = input.toLowerCase();
    
    // Filter terms that match the input
    const matchingTerms = gameTerms.filter(term => 
      term.toLowerCase().startsWith(inputLower) || 
      term.toLowerCase().includes(inputLower)
    );

    // Generate contextual suggestions
    const contextualSuggestions: string[] = [];
    if (ctx === "entity") {
      contextualSuggestions.push(
        `${input} provides +1 to all stats`,
        `${input} can be equipped by any player`,
        `${input} has a unique ability`
      );
    } else if (ctx === "rule") {
      contextualSuggestions.push(
        `${input} must be resolved at end of turn`,
        `${input} applies to all players equally`,
        `${input} cannot be used more than once per round`
      );
    }

    return [...matchingTerms.slice(0, 3), ...contextualSuggestions.slice(0, 2)];
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    setIsOpen(false);
  };

  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild ref={triggerRef}>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
          disabled={disabled}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {suggestions.length > 0 && !loading && (
            <span className="ml-1">{suggestions.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">AI Suggestions</p>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AiTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  context?: string;
  disabled?: boolean;
  className?: string;
}

export function AiTextarea({ value, onChange, placeholder, context, disabled, className }: AiTextareaProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    // Append suggestion to current value
    const newValue = localValue ? `${localValue} ${suggestion}` : suggestion;
    handleChange(newValue);
  };

  return (
    <div className="relative">
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full min-h-[80px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      />
      <div className="absolute top-2 right-2">
        <AiSuggestions
          value={localValue}
          onChange={handleChange}
          onSuggestionSelect={handleSuggestionSelect}
          context={context}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
