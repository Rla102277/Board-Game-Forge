import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { MessageSquare, Send, Reply, CheckCircle, Trash2, MoreVertical, X } from "lucide-react";
import { collaborationApi, type Comment } from "@/lib/collaboration";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentsPanelProps {
  projectId: number;
  entityType?: string;
  entityId?: number | null;
}

export function CommentsPanel({ projectId, entityType, entityId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
  }, [projectId, entityType, entityId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await collaborationApi.listComments(projectId, entityType, entityId ?? undefined);
      // Build reply tree
      const commentMap = new Map<number, Comment>();
      const rootComments: Comment[] = [];
      
      data.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });
      
      data.forEach(comment => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
          commentMap.get(comment.parentId)!.replies!.push(commentMap.get(comment.id)!);
        } else {
          rootComments.push(commentMap.get(comment.id)!);
        }
      });
      
      setComments(rootComments);
    } catch (err) {
      toast({
        title: "Failed to load comments",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setSubmitting(true);
      await collaborationApi.createComment(projectId, {
        entityType: entityType || "general",
        entityId: entityId || null,
        content: newComment.trim(),
        parentId: replyTo || undefined,
      });
      setNewComment("");
      setReplyTo(null);
      setReplyText("");
      await loadComments();
    } catch (err) {
      toast({
        title: "Failed to post comment",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyText.trim()) return;
    
    try {
      setSubmitting(true);
      await collaborationApi.createComment(projectId, {
        entityType: entityType || "general",
        entityId: entityId || null,
        content: replyText.trim(),
        parentId,
      });
      setReplyText("");
      setReplyTo(null);
      await loadComments();
    } catch (err) {
      toast({
        title: "Failed to post reply",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: number, resolved: boolean) => {
    try {
      await collaborationApi.resolveComment(projectId, commentId, resolved);
      await loadComments();
    } catch (err) {
      toast({
        title: "Failed to update comment",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await collaborationApi.deleteComment(projectId, commentId);
      await loadComments();
    } catch (err) {
      toast({
        title: "Failed to delete comment",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? "ml-8 mt-3" : ""}`}>
      <div className={`p-3 rounded-lg border ${comment.resolved ? "bg-muted/50 opacity-70" : "bg-card"}`}>
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            {comment.author.imageUrl && <AvatarImage src={comment.author.imageUrl} alt="" />}
            <AvatarFallback className="text-xs">
              {comment.author.firstName?.[0] || comment.author.lastName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.author.firstName} {comment.author.lastName}
                </span>
                {comment.resolved && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleResolve(comment.id, !comment.resolved)}>
                      {comment.resolved ? "Reopen" : "Resolve"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReplyTo(comment.id)} className="flex items-center gap-2">
                      <Reply className="h-3 w-3" /> Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(comment.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <p className="text-sm mt-1">{comment.content}</p>
            
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Comments
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            No comments yet. Start the discussion!
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
        
        {/* Reply box */}
        {replyTo && (
          <div className="p-3 bg-muted rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Replying to comment</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[60px] resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={() => handleReply(replyTo)}
                disabled={!replyText.trim() || submitting}
              >
                {submitting ? "Sending..." : "Reply"}
              </Button>
            </div>
          </div>
        )}
        
        {/* New comment box */}
        <div className="pt-2 border-t">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? "Write your reply..." : "Add a comment..."}
            className="min-h-[80px] resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              className="gap-2"
            >
              {submitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4" /> Post Comment
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
