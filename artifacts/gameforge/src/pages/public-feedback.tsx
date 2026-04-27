import { useParams } from "wouter";
import { useState } from "react";
import { useGetPublicFeedbackProject } from "@workspace/api-client-react";
import { Gamepad2, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicFeedback() {
  const params = useParams();
  const token = params.token || "";
  const { data: project, isLoading, isError } = useGetPublicFeedbackProject(token);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/public/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentName: name || undefined,
          funScore: rating === "" ? undefined : Number(rating),
          whatWorked: content,
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      setSubmitted(true);
    } catch {
      setError("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <span className="font-semibold">GameForge Playtest</span>
        </div>

        <Card>
          {isLoading ? (
            <CardContent className="p-8 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          ) : isError || !project ? (
            <CardContent className="p-8 text-center text-muted-foreground">
              This feedback link is invalid or has been disabled.
            </CardContent>
          ) : submitted ? (
            <CardContent className="p-10 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-bold">Thanks for your feedback!</h2>
              <p className="text-muted-foreground">The designers of <strong>{project.projectName}</strong> will review your notes.</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">{project.projectName}</CardTitle>
                <CardDescription>{project.description || "Share your playtest experience with the designers."}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name (optional)</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Anonymous" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating">Overall rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(rating === n ? "" : n)}
                          className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${rating === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Your thoughts *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={6}
                      placeholder="What worked? What didn't? What surprised you?"
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={submitting || !content.trim()} className="gap-2 w-full">
                    <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send feedback"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
