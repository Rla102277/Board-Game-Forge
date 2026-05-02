import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useUserArtifact } from "@/hooks/use-user-artifact";

type Msg = { role: "user" | "assistant"; content: string };

interface LearnChatProps {
  topicId: string;
  topicTitle: string;
  starterQuestions?: string[];
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_PERSISTED_MESSAGES = 40;

// Legacy localStorage key (per topic). Kept for one-time migration on first load.
function legacyStorageKey(topicId: string) {
  return `gameforge.learn.chat.${topicId}`;
}

function isValidMsg(x: unknown): x is Msg {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (r.role === "user" || r.role === "assistant") && typeof r.content === "string";
}

type ChatArtifact = Record<string, Msg[]>;

export function LearnChat({ topicId, topicTitle, starterQuestions = [] }: LearnChatProps) {
  // Per-user chat artifact: all topic histories share one row keyed by topicId.
  const { state: chatArtifact, setState: setChatArtifact, isLoading: isChatLoading } =
    useUserArtifact<ChatArtifact>("learn-chat", () => ({}));
  const messages = useMemo<Msg[]>(
    () => (chatArtifact[topicId] ?? []).filter(isValidMsg).slice(-MAX_PERSISTED_MESSAGES),
    [chatArtifact, topicId],
  );
  const setMessages = (next: Msg[] | ((prev: Msg[]) => Msg[])) => {
    setChatArtifact((prev) => {
      const cur = prev[topicId] ?? [];
      const computed = typeof next === "function" ? next(cur) : next;
      return { ...prev, [topicId]: computed.slice(-MAX_PERSISTED_MESSAGES) };
    });
  };

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // One-time legacy import per topic: gated on hydration completion to avoid
  // racing with the server fetch (which would otherwise overwrite remote data
  // with a partial topic-only payload). Only runs when the artifact has nothing
  // for this topic AND localStorage still holds the old per-topic key.
  const importedTopicsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (isChatLoading) return; // wait for server hydration
    if (importedTopicsRef.current.has(topicId)) return;
    if (chatArtifact[topicId] && chatArtifact[topicId].length > 0) {
      importedTopicsRef.current.add(topicId);
      return;
    }
    try {
      const raw = localStorage.getItem(legacyStorageKey(topicId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(isValidMsg).slice(-MAX_PERSISTED_MESSAGES);
          if (valid.length > 0) {
            // Merge against current hydrated artifact so we never clobber other topics.
            setChatArtifact((prev) => ({ ...prev, [topicId]: valid }));
          }
        }
        try { localStorage.removeItem(legacyStorageKey(topicId)); } catch { /* ignore */ }
      }
    } catch { /* ignore corrupt legacy data */ }
    importedTopicsRef.current.add(topicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatLoading, topicId, chatArtifact[topicId]?.length]);

  // Reset transient UI when topic changes.
  useEffect(() => { setError(null); setDraft(""); }, [topicId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/learn/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          message: trimmed,
          history: messages.slice(-10),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { reply: string };
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError(null);
  };

  const showStarters = useMemo(() => messages.length === 0 && starterQuestions.length > 0, [messages, starterQuestions]);

  return (
    <Card className="bg-card border-border" data-testid="learn-chat">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Ask the tutor
          </CardTitle>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={clear}
              data-testid="learn-chat-clear"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask anything about <span className="text-foreground font-medium">{topicTitle}</span>.
          Switch chapters to ask about a different topic.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1"
          data-testid="learn-chat-thread"
        >
          {showStarters && (
            <div className="rounded-md border border-dashed border-border/60 p-3 space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Try asking
              </div>
              <div className="flex flex-col gap-1.5">
                {starterQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    disabled={loading}
                    className="text-left text-xs rounded-md border border-border/60 bg-muted/30 hover:bg-muted/60 px-2.5 py-1.5 transition-colors disabled:opacity-50"
                    data-testid={`learn-chat-starter-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm leading-relaxed rounded-md px-3 py-2 ${
                m.role === "user"
                  ? "bg-primary/10 border border-primary/30 text-foreground"
                  : "bg-muted/40 border border-border/60 text-foreground/90 whitespace-pre-wrap"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {m.role === "user" ? "You" : "Tutor"}
              </div>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="text-sm rounded-md px-3 py-2 bg-muted/40 border border-border/60 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tutor is thinking…
            </div>
          )}
          {error && (
            <div className="text-xs rounded-md px-3 py-2 bg-destructive/10 border border-destructive/40 text-destructive">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-end gap-2 pt-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder={`Ask anything about "${topicTitle}"…`}
            disabled={loading}
            className="min-h-[48px] max-h-[120px] resize-none bg-muted/30 border-border/60 text-sm"
            data-testid="learn-chat-input"
          />
          <Button
            onClick={() => send(draft)}
            disabled={!draft.trim() || loading}
            size="sm"
            className="h-10 gap-1.5 shrink-0"
            data-testid="learn-chat-send"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
