import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Reply, Trash2, Loader2 } from "lucide-react";
import { useListComments, useCreateComment, useDeleteComment, useListProjectUsers } from "@/hooks/use-collaboration";
import { formatDistanceToNow } from "date-fns";
import type { TaskComment } from "@/lib/collaboration-types";
import { MentionInput } from "./mention-input";

interface CommentsPanelProps {
  projectId: number;
  entityType?: string;
  entityId?: number | null;
}

export function CommentsPanel({ projectId: _projectId, entityType = "task", entityId }: CommentsPanelProps) {
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const effectiveEntityId = entityId ?? _projectId;

  const { data: comments, isLoading } = useListComments(entityType, effectiveEntityId, _projectId);
  const { data: users } = useListProjectUsers(_projectId);
  const create = useCreateComment();
  const remove = useDeleteComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await create.mutateAsync({ entityType, entityId: effectiveEntityId, content: content.trim(), parentId: replyTo, projectId: _projectId });
    setContent("");
    setReplyTo(null);
  };

  const topLevel = comments?.filter((c) => c.parentId === null) ?? [];
  const replies = comments?.filter((c) => c.parentId !== null) ?? [];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Comments
          {comments && <span className="text-xs font-normal text-muted-foreground">({comments.length})</span>}
        </CardTitle>
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
          ) : topLevel.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {topLevel.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={replies.filter((r) => r.parentId === comment.id)}
                  onReply={(id) => { setReplyTo(id); setContent(""); }}
                  onDelete={(id) => remove.mutate({ commentId: id, entityType, entityId: effectiveEntityId })}
                  isDeleting={remove.isPending}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="space-y-2 shrink-0">
          {replyTo !== null && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Reply className="h-3 w-3" />
              <span>Replying to a comment</span>
              <button type="button" className="underline hover:text-foreground" onClick={() => setReplyTo(null)}>
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

function CommentItem({
  comment,
  replies,
  onReply,
  onDelete,
  isDeleting,
}: {
  comment: TaskComment;
  replies: TaskComment[];
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          {comment.author.imageUrl && <AvatarImage src={comment.author.imageUrl} alt="" />}
          <AvatarFallback className="text-xs">
            {(comment.author.firstName?.[0] ?? comment.author.email?.[0] ?? "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {[comment.author.firstName, comment.author.lastName].filter(Boolean).join(" ") || comment.author.email || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Reply className="h-3 w-3" /> Reply
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              disabled={isDeleting}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-border pl-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-7 w-7">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
