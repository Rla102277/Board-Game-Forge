import { useState } from "react";
import { useListChangelog } from "@workspace/api-client-react";
import { Download, FileText, FileJson, Package, History, Mail, Layout } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const FORMATS = [
  { kind: "tts-json", icon: FileJson, title: "Tabletop Simulator JSON", desc: "Drop this into Tabletop Simulator to import your prototype." },
  { kind: "rulebook-md", icon: FileText, title: "Rulebook (Markdown)", desc: "AI-formatted rulebook ready to publish." },
  { kind: "kickstarter", icon: Layout, title: "Kickstarter copy", desc: "Pitch-ready campaign description." },
  { kind: "sell-sheet", icon: Package, title: "Sell sheet", desc: "Single-page sales overview for retailers and publishers." },
  { kind: "press-kit", icon: Mail, title: "Press kit", desc: "Talking points and media assets for outreach." },
] as const;

export function Exports({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const { data: changelog, isLoading } = useListChangelog(projectId);
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadFile = async (kind: typeof FORMATS[number]["kind"]) => {
    setDownloading(kind);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/projects/${projectId}/export/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      if (!res.ok) throw new Error("download failed");
      const data: { kind: string; content: string; contentType: string; filename: string } = await res.json();
      const blob = new Blob([data.content], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: `${data.filename} downloaded.` });
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
    finally { setDownloading(null); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Download className="h-6 w-6 text-primary" /> Export</h2>
        <p className="text-muted-foreground text-sm mt-1">Generate downloadable artifacts for play, pitching, and publishing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FORMATS.map(f => {
          const Icon = f.icon;
          return (
            <Card key={f.kind} className="bg-card border-card-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => downloadFile(f.kind)} disabled={downloading === f.kind} className="gap-2">
                  <Download className="h-4 w-4" /> {downloading === f.kind ? "Generating..." : "Generate & download"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Changelog</CardTitle>
          <CardDescription>Auto-tracked design milestones and AI changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : !changelog?.length ? (
            <div className="text-sm text-muted-foreground text-center py-6">No changes recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {changelog.map(c => (
                <div key={c.id} className="border-l-2 border-primary/40 pl-4 py-1">
                  <div className="text-sm font-medium">{c.summary}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy h:mm a")} • {c.action}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
