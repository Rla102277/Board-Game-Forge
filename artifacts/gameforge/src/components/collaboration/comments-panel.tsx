import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare, Send, Reply, Trash2, Loader2, CheckCircle2,
  Circle, Pencil, Check, X, Smile, Filter,
} from "lucide-react";
import {
  useListComments, useCreateComment, useDeleteComment,
  useResolveComment, useToggleReaction, useListProjectUsers,
} from "@/hooks/use-collaboration";
import { formatDistanceToNow } from "date-fns";
import type { TaskComment, CommentReaction } from "@/lib/collaboration-types";
import { MentionInput } from "./mention-input";

const QUICK_EMOJIS = ["👍", "❤️", "😄", "🎉", "🤔", "👀"];

interface CommentsPanelProps {
  projectId: number;
  entityType?: string;
  entityId?: number | null;
  currentUserId?: number;
}

export function CommentsPanel({
  projectId: _projectId,
  entityType = "task",
  entityId,
  currentUserId,
}: CommentsPanelProps) {
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const effectiveEntityId = entityId ?? _projectId;

  const { data: allComments, isLoading } = useListComments(entityType, effectiveEntityId, _projectId);
  const { data: users } = useListProjectUsers(_projectId);
  const create = useCreateComment();
  const remove = useDeleteComment();
  const resolve = useResolveComment();
  const react = useToggleReaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await create.mutateAsync({ entityType, entityId: effectiveEntityId, content: content.trim(), parentId: replyTo, projectId: _projectId });
    setContent("");
    setReplyTo(null);
  };

  const topLevel = allComments?.filter((c) => c.parentId === null) ?? [];
  const replies = allComments?.filter((c) => c.parentId !== null) ?? [];
  const filtered = showResolved ? topLevel : topLevel.filter((c) => !c.resolved);
  const resolvedCount = topLevel.filter((c) => c.resolved).length;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comments
            {allComments && <span className="text-xs font-normal text-muted-foreground">({allComments.length})</span>}
          </CardTitle>
          {resolvedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setShowResolved((v) => !v)}
            >
              <Filter className="h-3 w-3" />
              {showResolved ? "Hide resolved" : `Show resolved (${resolvedCount})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0 gap-4">
        <ScrollArea className="flex-1 -mx-2 px-2">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {topLevel.length === 0 ? "No comments yet. Start the conversation!" : "No open comments."}
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {filtered.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={replies.filter((r) => r.parentId === comment.id)}
                  currentUserId={currentUserId}
                  entityType={entityType}
                  entityId={effectiveEntityId}
                  onReply={(id) => { setReplyTo(id); setContent(""); }}
                  onDelete={(id) => remove.mutate({ commentId: id, entityType, entityId: effectiveEntityId })}
                  onResolve={(id, resolved) => resolve.mutate({ commentId: id, resolved, entityType, entityId: effectiveEntityId })}
                  onReact={(id, emoji) => react.mutate({ commentId: id, emoji, entityType, entityId: effectiveEntityId })}
                  isDeleting={remove.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="space-y-2 shrink-0">
          {replyTo !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
              <Reply className="h-3 w-3" />
              <span>Replying to a comment</span>
              <button type="button" className="ml-auto underline hover:text-foreground" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <MentionInput
              placeholder={replyTo !== null ? "Write a reply..." : "Add a comment..."}
              value={content}
              onChange={setContent}
              rows={2}
              users={users?.map((u) => ({
                userId: String(u.id),
                userName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "User",
                avatarUrl: u.imageUrl ?? undefined,
              }))}
            />
            <Button type="submit" size="icon" disabled={!content.trim() || create.isPending} className="shrink-0 self-end">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ReactionBar({
  reactions,
  commentId,
  currentUserId,
  entityType,
  entityId,
  onReact,
}: {
  reactions: CommentReaction[];
  commentId: number;
  currentUserId?: number;
  entityType: string;
  entityId: number;
  onReact: (id: number, emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {reactions.map((r) => {
        const mine = currentUserId ? r.userIds.includes(currentUserId) : false;
        return (
          <Tooltip key={r.emoji}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onReact(commentId, r.emoji)}
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                  mine
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {mine ? "You reacted" : `${r.count} reaction${r.count !== 1 ? "s" : ""}`}
            </TooltipContent>
          </Tooltip>
        );
      })}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:bg-muted/40 transition-colors text-xs"
        >
          <Smile className="h-3 w-3" />
        </button>
        {showPicker && (
          <div className="absolute bottom-8 left-0 z-50 flex gap-1 bg-popover border border-border rounded-lg p-1.5 shadow-md">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onReact(commentId, emoji); setShowPicker(false); }}
                className="text-base hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  currentUserId,
  entityType,
  entityId,
  onReply,
  onDelete,
  onResolve,
  onReact,
  isDeleting,
}: {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: number;
  entityType: string;
  entityId: number;
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
  onResolve: (id: number, resolved: boolean) => void;
  onReact: (id: number, emoji: string) => void;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const isOwn = currentUserId === comment.author.id;

  return (
    <div className={`space-y-3 ${comment.resolved ? "opacity-60" : ""}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {comment.author.imageUrl && <AvatarImage src={comment.author.imageUrl} alt="" />}
          <AvatarFallback className="text-xs">
            {(comment.author.firstName?.[0] ?? comment.author.email?.[0] ?? "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium">
              {[comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ") || comment.author.email || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.resolved && (
              <Badge variant="outline" className="h-4 text-[10px] gap-0.5 border-green-500/30 text-green-500 bg-green-500/10 px-1.5 py-0">
                <CheckCircle2 className="h-2.5 w-2.5" /> Resolved
              </Badge>
            )}
          </div>

          {editing ? (
            <div className="space-y-1.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditContent(comment.content); }}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}

          <ReactionBar
            reactions={comment.reactions}
            commentId={comment.id}
            currentUserId={currentUserId}
            entityType={entityType}
            entityId={entityId}
            onReact={onReact}
          />

          <div className="flex items-center gap-3 mt-1.5">
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
            <button
              type="button"
              onClick={() => onResolve(comment.id, !comment.resolved)}
              className={`text-xs flex items-center gap-1 transition-colors ${
                comment.resolved
                  ? "text-green-500 hover:text-muted-foreground"
                  : "text-muted-foreground hover:text-green-500"
              }`}
            >
              {comment.resolved
                ? <><Circle className="h-3 w-3" /> Reopen</>
                : <><CheckCircle2 className="h-3 w-3" /> Resolve</>
              }
            </button>
            {isOwn && !editing && (
              <button
                type="button"
                onClick={() => { setEditing(true); setEditContent(comment.content); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                {reply.author.imageUrl && <AvatarImage src={reply.author.imageUrl} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {(reply.author.firstName?.[0] ?? reply.author.email?.[0] ?? "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">
                    {[reply.author.firstName, reply.author.lastName].filter(Boolean).join(" ") || reply.author.email || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                <ReactionBar
                  reactions={reply.reactions}
                  commentId={reply.id}
                  currentUserId={currentUserId}
                  entityType={entityType}
                  entityId={entityId}
                  onReact={onReact}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
