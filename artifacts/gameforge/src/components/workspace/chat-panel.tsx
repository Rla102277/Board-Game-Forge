import { useState, useRef, useEffect } from "react";
import { useListChatMessages, useClearChatMessages, getListChatMessagesQueryKey, getGetProjectStatsQueryKey } from "@workspace/api-client-react";
import { Bot, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatPanelProps {
  projectId: number;
  defaultPrompt?: string;
  onPromptClear?: () => void;
}

const GAME_TYPES = ["Strategy", "Family", "Party", "Cooperative", "Worker Placement", "Deck-builder", "Area Control", "Eurogame", "Wargame", "Roll-and-Write", "Dexterity", "Legacy"];
const GENRES = ["Fantasy", "Sci-Fi", "Horror", "Historical", "Modern", "Cyberpunk", "Steampunk", "Mystery", "Adventure", "Abstract"];
const MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5"];

export function ChatPanel({ projectId, defaultPrompt, onPromptClear }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useListChatMessages(projectId);
  const clearChat = useClearChatMessages();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

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

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const content = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistic update for user message
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
        model,
        createdAt: new Date().toISOString()
      }];
    });

    try {
      const url = `${import.meta.env.BASE_URL}api/projects/${projectId}/chat/send`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, gameType: selectedGameType || undefined, genre: selectedGenre || undefined, model }),
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
            if (json.done) {
              // Finish stream
            }
          } catch (e) {
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

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full flex-shrink-0 z-20">
      <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card shrink-0">
        <div className="flex items-center gap-2 font-semibold text-primary">
          <Bot className="h-4 w-4" /> GameForge AI
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="bg-background border border-border rounded text-xs py-1 px-2 cursor-pointer outline-none focus:border-primary"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
            {messages?.map(msg => (
              <div key={msg.id} className={`flex flex-col gap-1 max-w-[90%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary/20 text-foreground border border-primary/30 rounded-br-sm' : 'bg-sidebar text-sidebar-foreground border border-border rounded-bl-sm whitespace-pre-wrap font-mono leading-relaxed'}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (msg.gameType || msg.genre || msg.model) && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {msg.gameType && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{msg.gameType}</span>}
                    {msg.genre && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{msg.genre}</span>}
                    {msg.model && <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border">{msg.model === 'claude-sonnet-4-6' ? 'Sonnet' : 'Haiku'}</span>}
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex flex-col gap-1 max-w-[90%] self-start items-start">
                <div className="p-3 rounded-lg text-sm bg-sidebar text-sidebar-foreground border border-border rounded-bl-sm whitespace-pre-wrap font-mono leading-relaxed relative min-w-[3rem]">
                  {streamingContent}
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
