

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api-client";
import { appToast } from "@/lib/toast";
import { formatRelative, formatDateTime } from "@/lib/utils";
import { Send, MessageSquare, AtSign, Reply, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  document_id: string;
  author: string;
  author_color?: string;
  body: string;
  created_at: string;
  parent_id?: string | null;
  mentions?: string[];
}

interface CommentsSectionProps {
  documentId: string;
}

const MOCK_USERS = [
  { name: "Marie Dupont", email: "marie.dupont@transport-dupont.fr", color: "#2563EB" },
  { name: "Sophie Lefevre", email: "sophie.lefevre@transport-dupont.fr", color: "#7C3AED" },
  { name: "Marc Dubois", email: "marc.dubois@transport-dupont.fr", color: "#DC2626" },
  { name: "Jean Martin", email: "jean.martin@transport-dupont.fr", color: "#16A34A" },
  { name: "Paul Girard", email: "paul.girard@transport-dupont.fr", color: "#D97706" },
];

function renderMarkdown(text: string): React.ReactNode {
  // Very basic markdown: **bold**, *italic*, `code`, @mentions
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[\wàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s.-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("@")) {
      return (
        <span key={i} className="inline-flex items-center gap-0.5 px-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium">
          <AtSign className="size-3" />
          {part.slice(1)}
        </span>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function CommentsSection({ documentId }: CommentsSectionProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [replyBody, setReplyBody] = React.useState("");
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionTarget, setMentionTarget] = React.useState<"main" | "reply">("main");
  const [isSending, setIsSending] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<{ items: Comment[] }>(
        `/api/comments?document_id=${documentId}`
      );
      setComments(data.items);
    } catch {
      // ignore
    }
  }, [documentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Detect @mention in body
  React.useEffect(() => {
    const match = body.match(/@([\wàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s.-]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1]);
      setMentionTarget("main");
    } else if (replyBody.match(/@([\wàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s.-]*)$/)) {
      setMentionOpen(true);
      setMentionQuery(
        replyBody.match(/@([\wàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s.-]*)$/)![1]
      );
      setMentionTarget("reply");
    } else {
      setMentionOpen(false);
    }
  }, [body, replyBody]);

  const filteredUsers = MOCK_USERS.filter((u) =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const insertMention = (userName: string) => {
    const setter = mentionTarget === "main" ? setBody : setReplyBody;
    const current = mentionTarget === "main" ? body : replyBody;
    setter(current.replace(/@([\wàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ\s.-]*)$/, `@${userName} `));
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const submit = async () => {
    if (!body.trim()) return;
    setIsSending(true);
    try {
      await apiPost("/api/comments", {
        document_id: documentId,
        body: body.trim(),
      });
      setBody("");
      await load();
      appToast.success("Commentaire ajouté");
    } catch {
      appToast.error("Erreur");
    } finally {
      setIsSending(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setIsSending(true);
    try {
      await apiPost("/api/comments", {
        document_id: documentId,
        body: replyBody.trim(),
        parent_id: parentId,
      });
      setReplyBody("");
      setReplyTo(null);
      await load();
      appToast.success("Réponse ajoutée");
    } catch {
      appToast.error("Erreur");
    } finally {
      setIsSending(false);
    }
  };

  // Group comments: top-level + their replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce<Record<string, Comment[]>>(
    (acc, c) => {
      if (c.parent_id) {
        if (!acc[c.parent_id]) acc[c.parent_id] = [];
        acc[c.parent_id].push(c);
      }
      return acc;
    },
    {}
  );

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="size-4" />
          Commentaires ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment input */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ajouter un commentaire... (Markdown supporté : **bold**, *italic*, `code`, @mention)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          {mentionOpen && filteredUsers.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 sm:right-auto sm:w-64 rounded-md border border-border bg-popover shadow-md z-10 max-h-48 overflow-y-auto scrollbar-thin">
              {filteredUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => insertMention(u.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left transition-colors"
                >
                  <Avatar className="size-6">
                    <AvatarFallback
                      className="text-white text-[10px]"
                      style={{ backgroundColor: u.color }}
                    >
                      {initials(u.name.split(" ")[0], u.name.split(" ")[1])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Astuce : ⌘+Entrée pour envoyer
            </p>
            <Button
              size="sm"
              onClick={() => void submit()}
              disabled={!body.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Envoyer
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {topLevel.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun commentaire pour le moment. Soyez le premier à réagir !
          </div>
        ) : (
          <div className="space-y-4">
            {topLevel.map((c) => (
              <div key={c.id} className="space-y-2">
                <CommentItem comment={c} />
                {repliesByParent[c.id]?.map((r) => (
                  <div key={r.id} className="pl-8">
                    <CommentItem comment={r} />
                  </div>
                ))}
                {replyTo === c.id ? (
                  <div className="pl-8 space-y-2">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={`Répondre à ${c.author}...`}
                      className="min-h-[60px]"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void submitReply(c.id)}
                        disabled={!replyBody.trim() || isSending}
                      >
                        Répondre
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(c.id);
                      setReplyBody("");
                    }}
                    className="ml-8 text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Reply className="size-3" />
                    Répondre
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const [first, last] = comment.author.split(" ");
  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback
          className="text-white text-xs"
          style={{ backgroundColor: comment.author_color ?? "#6B7280" }}
        >
          {initials(first, last)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">
            {comment.author}
          </span>
          <time
            className="text-xs text-muted-foreground"
            title={formatDateTime(comment.created_at)}
          >
            {formatRelative(comment.created_at)}
          </time>
        </div>
        <div className="mt-1 text-sm text-foreground leading-relaxed">
          {renderMarkdown(comment.body)}
        </div>
      </div>
    </div>
  );
}

// Local Textarea to avoid extra import
function Textarea({
  ref,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}
