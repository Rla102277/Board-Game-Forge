import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link2, X, Search } from "lucide-react";

interface LinkedItem {
  id: number;
  type: "entity" | "rule" | "player" | "research";
  name: string;
  subtitle?: string;
}

interface LinkSelectorProps {
  linkedItems: LinkedItem[];
  onLink: (item: LinkedItem) => void;
  onUnlink: (itemId: number) => void;
  availableItems: LinkedItem[];
  itemType?: "entity" | "rule" | "player" | "research" | "all";
  maxLinks?: number;
  disabled?: boolean;
}

export function LinkSelector({ 
  linkedItems, 
  onLink, 
  onUnlink, 
  availableItems, 
  itemType = "all",
  maxLinks,
  disabled 
}: LinkSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = availableItems.filter(item => {
    const matchesType = itemType === "all" || item.type === itemType;
    const matchesSearch = !search || 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase()));
    const notLinked = !linkedItems.find(linked => linked.id === item.id);
    return matchesType && matchesSearch && notLinked;
  });

  const typeColors = {
    entity: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rule: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    player: "bg-green-500/20 text-green-400 border-green-500/30",
    research: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };

  const typeLabels = {
    entity: "Entity",
    rule: "Rule",
    player: "Player",
    research: "Research",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {linkedItems.map((item) => (
          <Badge key={item.id} variant="outline" className={`gap-1 ${typeColors[item.type]}`}>
            <Link2 className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{item.name}</span>
            {!disabled && (
              <button
                onClick={() => onUnlink(item.id)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {!disabled && (!maxLinks || linkedItems.length < maxLinks) && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Link2 className="h-4 w-4" />
              Link {itemType === "all" ? "Item" : typeLabels[itemType]}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items found
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onLink(item);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left"
                    >
                      <div className={`px-2 py-0.5 rounded text-[10px] ${typeColors[item.type]}`}>
                        {typeLabels[item.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        )}
                      </div>
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {maxLinks && (
        <p className="text-xs text-muted-foreground">
          {linkedItems.length} / {maxLinks} links
        </p>
      )}
    </div>
  );
}

interface LinkedReferenceProps {
  itemId: number;
  itemType: string;
  linkedItems: LinkedItem[];
  onNavigate?: (item: LinkedItem) => void;
}

export function LinkedReferences({ itemId, itemType, linkedItems, onNavigate }: LinkedReferenceProps) {
  if (linkedItems.length === 0) return null;

  return (
    <div className="border-t border-border pt-3 mt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Linked to:</p>
      <div className="flex flex-wrap gap-1">
        {linkedItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item)}
            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <Link2 className="h-3 w-3" />
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
