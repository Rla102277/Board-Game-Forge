import { useMemo } from "react";
import { useListEntities, useListRules } from "@workspace/api-client-react";
import { Network, Box, Activity, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function Ontology({ projectId }: { projectId: number }) {
  const { data: entities, isLoading: entLoading } = useListEntities(projectId);
  const { data: rules, isLoading: rulesLoading } = useListRules(projectId);

  const groupedEntities = useMemo(() => {
    if (!entities) return {};
    const out: Record<string, typeof entities> = {};
    for (const e of entities) {
      const key = e.type || "other";
      if (!out[key]) out[key] = [];
      out[key].push(e);
    }
    return out;
  }, [entities]);

  const links = useMemo(() => {
    if (!rules || !entities) return [];
    const found: { rule: typeof rules[number]; entities: typeof entities }[] = [];
    for (const r of rules) {
      const text = (r.title + " " + (r.content || "")).toLowerCase();
      const linked = entities.filter(e => text.includes(e.name.toLowerCase()) && e.name.length > 2);
      if (linked.length) found.push({ rule: r, entities: linked });
    }
    return found;
  }, [rules, entities]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6 text-primary" /> Ontology</h2>
        <p className="text-muted-foreground text-sm mt-1">A bird's-eye view of how your entities and rules connect.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Box className="h-5 w-5" /> Entity taxonomy</CardTitle>
            <CardDescription>Grouped by kind.</CardDescription>
          </CardHeader>
          <CardContent>
            {entLoading ? <Skeleton className="h-40" /> : !entities?.length ? (
              <p className="text-sm text-muted-foreground">No entities yet.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedEntities).map(([kind, ents]) => (
                  <div key={kind}>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{kind} <span className="text-foreground">({ents.length})</span></div>
                    <div className="flex flex-wrap gap-1.5">
                      {ents.map(e => (
                        <span key={e.id} className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded">{e.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Rule ↔ Entity links</CardTitle>
            <CardDescription>Rules that mention entities by name.</CardDescription>
          </CardHeader>
          <CardContent>
            {rulesLoading ? <Skeleton className="h-40" /> : !links.length ? (
              <p className="text-sm text-muted-foreground">No detected links yet. Reference entity names in rules to populate.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {links.map(({ rule, entities }) => (
                  <div key={rule.id} className="border-l-2 border-primary/40 pl-3 py-1">
                    <div className="font-medium text-sm">{rule.title}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entities.map(e => (
                        <span key={e.id} className="text-[10px] bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded">{e.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Coverage stats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Entity types" value={Object.keys(groupedEntities).length} />
          <Stat label="Total entities" value={entities?.length ?? 0} />
          <Stat label="Total rules" value={rules?.length ?? 0} />
          <Stat label="Linked rules" value={links.length} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
