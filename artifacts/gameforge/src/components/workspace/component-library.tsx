import { useState } from "react";
import { ChevronDown, ChevronRight, Lightbulb, Search, Library, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PHYSICAL_TYPES, WORLD_TYPES, type ComponentType } from "@/lib/game-component-types";
import { COMPONENT_DOCS, PROPERTY_GLOSSARY, type ComponentDoc } from "@/lib/component-docs";
import { useMemo } from "react";

// ════════════════════════════════════════════════════════════════════════════
// Component type reference card (collapsible)
// ════════════════════════════════════════════════════════════════════════════
export function ComponentTypeReference({ type }: { type: ComponentType }) {
  const doc = COMPONENT_DOCS[type as string] as ComponentDoc | undefined;
  const [open, setOpen] = useState(false);

  if (!doc) return null;

  return (
    <Card className={`border ${doc.border} ${doc.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-black/10 transition-colors"
        data-testid={`entity-doc-toggle-${type.toLowerCase()}`}
      >
        <span className="text-2xl shrink-0" aria-hidden>{doc.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-base font-bold ${doc.color}`}>{type}</h3>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${doc.badge}`}>Reference</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.tagline}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4 text-sm">
          <p className="text-foreground/90 leading-relaxed">{doc.what}</p>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Examples & ideas</h4>
            <ul className="grid sm:grid-cols-2 gap-1.5">
              {doc.ideas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className={`shrink-0 ${doc.color} mt-0.5`}>›</span>
                  <span className="text-foreground/80">{idea}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Suggested properties</h4>
            <div className="space-y-1">
              {doc.properties.map((p, i) => (
                <div key={i} className="grid grid-cols-[130px_60px_1fr] gap-3 text-xs">
                  <code className="font-mono text-foreground/90">{p.name}</code>
                  <span className="text-muted-foreground italic">{p.type}</span>
                  <span className="text-muted-foreground">{p.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" /> Design tip
            </h4>
            <p className="text-xs text-amber-100/90 leading-relaxed">{doc.designTip}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Property Glossary — searchable static reference
// ════════════════════════════════════════════════════════════════════════════

function typeBadgeLocal(type: string) {
  return COMPONENT_DOCS[type]?.badge ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export function PropertyGlossary() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PROPERTY_GLOSSARY;
    return PROPERTY_GLOSSARY.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.dataType.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.appliesTo.some((t) => t.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Library className="h-4 w-4" /> Property glossary
          <Badge variant="outline" className="text-[10px] ml-1">{PROPERTY_GLOSSARY.length} properties</Badge>
        </CardTitle>
        <CardDescription>
          Canonical definitions for common game-design properties — what they mean, which component types use them, and how they tie to your rules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, data type, or component type…"
            className="bg-input h-8 text-xs pl-8"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic p-2">No properties match that search.</p>
        ) : (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map((entry) => (
              <div
                key={entry.name}
                className="rounded-md border border-border/60 bg-background/30 p-3 space-y-2"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <code className="text-sm font-mono font-bold text-white">{entry.name}</code>
                  <Badge variant="outline" className="text-[10px] font-mono bg-secondary/30 shrink-0">
                    {entry.dataType}
                  </Badge>
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {entry.appliesTo.map((t) => (
                      <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded border ${typeBadgeLocal(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{entry.description}</p>
                <div className="rounded bg-primary/5 border border-primary/10 px-2.5 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary/60">Rules tie-in — </span>
                  <span className="text-xs text-foreground/70">{entry.rulesInteraction}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">{entry.example}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Combined library view
// ════════════════════════════════════════════════════════════════════════════
export function ComponentLibraryView() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" /> Component-type reference
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          What each type is for, design examples, suggested properties, and a design tip. Click any card to expand.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1">Physical components</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PHYSICAL_TYPES.map(t => <ComponentTypeReference key={t} type={t} />)}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2 pl-1 mt-4">World components</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WORLD_TYPES.map(t => <ComponentTypeReference key={t} type={t} />)}
            </div>
          </div>
        </div>
      </div>
      <PropertyGlossary />
    </div>
  );
}
