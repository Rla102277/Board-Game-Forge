import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, FileText, Layout, Activity, Users, Calendar, ExternalLink } from "lucide-react";

interface SearchResult {
  id: string;
  type: "project" | "entity" | "rule" | "task" | "note" | "research";
  title: string;
  description?: string;
  projectId?: number;
  projectName?: string;
  url: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
        const res = await fetch(`${apiBase}/api/search?q=${encodeURIComponent(query)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const typeIcons = {
    project: Layout,
    entity: FileText,
    rule: Activity,
    task: Calendar,
    note: FileText,
    research: FileText,
  };

  const typeLabels = {
    project: "Project",
    entity: "Entity",
    rule: "Rule",
    task: "Task",
    note: "Note",
    research: "Research",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, entities, rules, tasks..."
            className="pl-9"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            query.trim() ? (
              <div className="text-center py-8 text-muted-foreground">No results found</div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Start typing to search across all projects
              </div>
            )
          ) : (
            <div className="space-y-2">
              {results.map((result) => {
                const Icon = typeIcons[result.type];
                return (
                  <a
                    key={result.id}
                    href={result.url}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="p-2 bg-muted rounded">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {typeLabels[result.type]}
                        </Badge>
                      </div>
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {result.description}
                        </p>
                      )}
                      {result.projectName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          in {result.projectName}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘K</kbd>
            <span className="text-xs text-muted-foreground">to open</span>
          </div>
          <div className="flex gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">↑↓</kbd>
            <span className="text-xs text-muted-foreground">to navigate</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
            <span className="text-xs text-muted-foreground">to select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
