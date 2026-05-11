import { useState, useRef, useEffect, useMemo } from "react";
import {
  useListChatMessages,
  useClearChatMessages,
  useGetAiSettings,
  useUpdateAiSettings,
  useCreateNote,
  useCreateTask,
  getListChatMessagesQueryKey,
  getGetProjectStatsQueryKey,
  getGetAiSettingsQueryKey,
  getListNotesQueryKey,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Bot, Send, Trash2, Loader2, ChevronsRight, ChevronsLeft, StickyNote, ListChecks, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Markdown } from "@/components/markdown";
import {
  AVAILABLE_MODELS,
  FAMILY_LABELS,
  defaultModelOption,
  findModelOption,
  type ModelOption,
} from "@/lib/ai-models";

interface ChatPanelProps {
  projectId: number;
  defaultPrompt?: string;
  onPromptClear?: () => void;
  activeTab?: string;
}

const COLLAPSE_KEY = "gameforge.chatpanel.collapsed";

const GAME_TYPES = ["Strategy", "Family", "Party", "Cooperative", "Worker Placement", "Deck-builder", "Area Control", "Eurogame", "Wargame", "Roll-and-Write", "Dexterity", "Legacy"];
const GENRES = ["Fantasy", "Sci-Fi", "Horror", "Historical", "Modern", "Cyberpunk", "Steampunk", "Mystery", "Adventure", "Abstract"];

function modelKey(opt: { provider: string; model: string }) {
  return `${opt.provider}::${opt.model}`;
}

export function ChatPanel({ projectId, defaultPrompt, onPromptClear, activeTab }: ChatPanelProps) {
  void activeTab;
  const queryClient = useQueryClient();
  const { data: messages } = useListChatMessages(projectId);
  const { data: aiSettings } = useGetAiSettings();
  const updateAi = useUpdateAiSettings();
  const clearChat = useClearChatMessages();
  const createNote = useCreateNote();
  const createTask = useCreateTask();
  const { toast } = useToast();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const [savedMsgIds, setSavedMsgIds] = useState<Record<number, "note" | "task">>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSaveAsNote = async (msgId: number, content: string) => {
    try {
      const title = content.split(/\n|[.!?]/)[0]?.slice(0, 80).trim() || "From chat";
      await createNote.mutateAsync({ projectId, data: { title, content, color: "blue", pinned: false } });
      queryClient.invalidateQueries({ queryKey: getListNotesQueryKey(projectId) });
      setSavedMsgIds((prev) => ({ ...prev, [msgId]: "note" }));
      toast({ title: "Saved to Notes" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const handleSaveAsTask = async (msgId: number, content: string) => {
    try {
      const title = content.split(/\n|[.!?]/)[0]?.slice(0, 80).trim() || "From chat";
      await createTask.mutateAsync({ projectId, data: { title, description: content, status: "todo", priority: "medium" } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(projectId) });
      setSavedMsgIds((prev) => ({ ...prev, [msgId]: "task" }));
      toast({ title: "Saved to Tasks" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const selected: ModelOption = useMemo(() => {
    return (
      findModelOption(aiSettings?.provider, aiSettings?.model) ??
      defaultModelOption()
    );
  }, [aiSettings?.provider, aiSettings?.model]);

  const grouped = useMemo(() => {
    const map = new Map<ModelOption["family"], ModelOption[]>();
    for (const m of AVAILABLE_MODELS) {
      const arr = map.get(m.family) ?? [];
      arr.push(m);
      map.set(m.family, arr);
    }
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    if (defaultPrompt) {
      setInput(defaultPrompt);
      if (onPromptClear) onPromptClear();
    }
  }, [defaultPrompt, onPromptClear]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleClear = async () => {
    await clearChat.mutateAsync({ projectId });
    queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
  };

  const handleModelChange = async (key: string) => {
    const [provider, ...modelParts] = key.split("::");
    const model = modelParts.join("::");
    const opt = AVAILABLE_MODELS.find(m => m.provider === provider && m.model === model);
    if (!opt) return;
    try {
      await updateAi.mutateAsync({ data: { provider: opt.provider, model: opt.model } });
      queryClient.invalidateQueries({ queryKey: getGetAiSettingsQueryKey() });
    } catch (e) {
      console.error("Failed to update AI provider", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const content = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    const tempId = Date.now();
    queryClient.setQueryData(getListChatMessagesQueryKey(projectId), (old: any) => {
      const msgs = old || [];
      return [...msgs, {
        id: tempId,
        projectId,
        role: "user",
        content,
        gameType: selectedGameType,
        genre: selectedGenre,
        model: selected.model,
        createdAt: new Date().toISOString()
      }];
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const url = `${apiUrl}/api/projects/${projectId}/chat/send`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          gameType: selectedGameType || undefined,
          genre: selectedGenre || undefined,
          model: selected.model,
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const ev of events) {
          const line = ev.trim().replace(/^data:\s*/, "");
          if (!line) continue;
          try {
            const json = JSON.parse(line);
            if (json.content) {
              setStreamingContent(prev => prev + json.content);
            }
          } catch {
            console.error("Failed to parse SSE event", line);
          }
        }
      }
    } catch (err) {
      console.error("Stream failed", err);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l border-border bg-card flex flex-col items-center py-2 gap-2 h-full flex-shrink-0 z-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => setCollapsed(false)}
              data-testid="chat-expand"
              title="Expand chat"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Expand GameForge AI</TooltipContent>
        </Tooltip>
        <div className="rotate-180 [writing-mode:vertical-rl] text-[10px] uppercase tracking-widest text-muted-foreground select-none">GameForge AI</div>
      </div>
    );
  }

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full flex-shrink-0 z-20">
      <div className="h-12 border-b border-border flex items-center px-3 justify-between bg-card shrink-0 gap-2">
        <div className="flex items-center gap-2 font-semibold text-primary shrink-0">
          <Bot className="h-4 w-4" /> GameForge AI
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(true)}
                data-testid="chat-collapse"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse</TooltipContent>
          </Tooltip>
          <Select value={modelKey(selected)} onValueChange={handleModelChange}>
            <SelectTrigger className="h-8 text-xs px-2 max-w-[180px] truncate" data-testid="select-ai-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="max-h-[420px]">
              {grouped.map(([family, opts]) => (
                <SelectGroup key={family}>
                  <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {FAMILY_LABELS[family]}
                  </SelectLabel>
                  {opts.map(opt => (
                    <SelectItem key={modelKey(opt)} value={modelKey(opt)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClear}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Chat</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-background" ref={scrollRef}>
        {messages?.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 opacity-50">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm">I'm your AI design assistant. Ask me to generate mechanics, lore, rules, or anything else you need.</p>
          </div>
        ) : (
          <>
            {messages?.map(msg => {
              const labelOpt = findModelOption(undefined, msg.model ?? undefined)
                ?? AVAILABLE_MODELS.find(m => m.model === msg.model);
              const savedAs = savedMsgIds[msg.id];
              return (
                <div key={msg.id} className={`group flex flex-col gap-1 max-w-[92%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`px-3 py-2 rounded-lg text-sm ${msg.role === 'user'
                    ? 'bg-primary/20 text-foreground border border-primary/30 rounded-br-sm whitespace-pre-wrap'
                    : 'bg-sidebar text-sidebar-foreground border border-border rounded-bl-sm leading-relaxed'}`}>
                    {msg.role === 'assistant'
                      ? <Markdown>{msg.content}</Markdown>
                      : msg.content}
                  </div>
                  {msg.role === 'user' && (msg.gameType || msg.genre || msg.model) && (
                    <div className="flex flex-wrap gap-1 mt-1 justify-end">
                      {msg.gameType && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{msg.gameType}</span>}
                      {msg.genre && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{msg.genre}</span>}
                      {msg.model && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{labelOpt?.label ?? msg.model}</span>}
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => handleSaveAsNote(msg.id, msg.content)}
                            disabled={savedAs === "note"}
                            data-testid={`chat-save-note-${msg.id}`}
                          >
                            {savedAs === "note" ? <Check className="h-3 w-3 mr-1" /> : <StickyNote className="h-3 w-3 mr-1" />}
                            {savedAs === "note" ? "Saved" : "Note"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save to Notes</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => handleSaveAsTask(msg.id, msg.content)}
                            disabled={savedAs === "task"}
                            data-testid={`chat-save-task-${msg.id}`}
                          >
                            {savedAs === "task" ? <Check className="h-3 w-3 mr-1" /> : <ListChecks className="h-3 w-3 mr-1" />}
                            {savedAs === "task" ? "Saved" : "Task"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save to Tasks</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })}
            {isStreaming && (
              <div className="flex flex-col gap-1 max-w-[92%] self-start items-start">
                <div className="px-3 py-2 rounded-lg text-sm bg-sidebar text-sidebar-foreground border border-border rounded-bl-sm leading-relaxed relative min-w-[3rem]">
                  {streamingContent ? <Markdown>{streamingContent}</Markdown> : <span className="text-muted-foreground italic">Thinking…</span>}
                  <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border bg-card p-3 flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Textarea
            placeholder="Ask for ideas, rules, entities..."
            className="bg-background min-h-[60px] resize-none pr-10 border-input focus-visible:ring-1 focus-visible:ring-primary"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            variant="default"
            className="absolute bottom-2 right-2 h-8 w-8"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-chat"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-16 shrink-0">Type</span>
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex w-max space-x-1.5">
                {GAME_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedGameType(prev => prev === type ? null : type)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${selectedGameType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold w-16 shrink-0">Genre</span>
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex w-max space-x-1.5">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(prev => prev === genre ? null : genre)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${selectedGenre === genre ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/50'}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
