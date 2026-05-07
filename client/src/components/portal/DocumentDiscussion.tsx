import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Send, Reply, Edit3, Trash2, ChevronDown,
  ChevronUp, CheckCircle2, Circle, MoreHorizontal, X, Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Comment {
  id: number;
  document_id: number;
  parent_id: number | null;
  author_id: number;
  content: string;
  resolved: boolean;
  created_at: string;
  edited_at: string | null;
  first_name: string | null;
  last_name: string | null;
  // client-side tree
  replies?: Comment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<number, Comment>();
  flat.forEach(c => map.set(c.id, { ...c, replies: [] }));
  const roots: Comment[] = [];
  map.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

function initials(first: string | null, last: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function authorName(c: Comment) {
  if (c.first_name || c.last_name) return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  return "Board Member";
}

// ── Avatar ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
  "bg-sky-100 text-sky-700",
];

function Avatar({ authorId, first, last, size = "sm" }: { authorId: number; first: string | null; last: string | null; size?: "xs" | "sm" }) {
  const color = AVATAR_COLORS[authorId % AVATAR_COLORS.length];
  const sz = size === "xs" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold shrink-0`}>
      {initials(first, last)}
    </div>
  );
}

// ── Compose box ───────────────────────────────────────────────────────────────

function ComposeBox({
  placeholder,
  onSubmit,
  onCancel,
  initialValue = "",
  autoFocus = false,
}: {
  placeholder: string;
  onSubmit: (text: string) => Promise<void>;
  onCancel?: () => void;
  initialValue?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    await onSubmit(text.trim());
    setText("");
    setBusy(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
    if (e.key === "Escape" && onCancel) onCancel();
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
        data-testid="textarea-comment"
      />
      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1" data-testid="button-cancel-comment">
            Cancel
          </button>
        )}
        <Button
          size="sm"
          onClick={submit}
          disabled={!text.trim() || busy}
          className="bg-[#2563EB] hover:bg-teal-700 text-white gap-1.5 text-xs h-7 px-3"
          data-testid="button-submit-comment"
        >
          <Send className="w-3 h-3" />
          {busy ? "Posting…" : "Post"}
        </Button>
        <span className="text-[10px] text-slate-300 hidden sm:inline">⌘↵ to send</span>
      </div>
    </div>
  );
}

// ── Single comment node (recursive) ──────────────────────────────────────────

function CommentNode({
  comment,
  currentUserId,
  isAdmin,
  depth,
  documentId,
  onReplyPosted,
  onUpdated,
  onDeleted,
}: {
  comment: Comment;
  currentUserId: number;
  isAdmin: boolean;
  depth: number;
  documentId: number;
  onReplyPosted: (c: Comment) => void;
  onUpdated: (c: Comment) => void;
  onDeleted: (id: number) => void;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();

  const isMine = comment.author_id === currentUserId;
  const canEdit = isMine;
  const canDelete = isMine || isAdmin;
  const hasReplies = (comment.replies?.length ?? 0) > 0;
  const maxDepth = 4;

  async function postReply(text: string) {
    const r = await apiRequest("POST", `/api/board/documents/${documentId}/comments`, {
      content: text,
      parentId: comment.id,
    });
    if (r.success) {
      onReplyPosted(r.data);
      setReplying(false);
    } else {
      toast({ title: "Failed to post reply", description: r.error, variant: "destructive" });
    }
  }

  async function saveEdit(text: string) {
    const r = await apiRequest("PATCH", `/api/board/document-comments/${comment.id}`, { content: text });
    if (r.success) {
      onUpdated({ ...comment, content: text, edited_at: new Date().toISOString() });
      setEditing(false);
    } else {
      toast({ title: "Failed to edit", description: r.error, variant: "destructive" });
    }
  }

  async function deleteComment() {
    if (!confirm("Delete this comment and all its replies?")) return;
    const r = await apiRequest("DELETE", `/api/board/document-comments/${comment.id}`);
    if (r.success) {
      onDeleted(comment.id);
    } else {
      toast({ title: "Failed to delete", description: r.error, variant: "destructive" });
    }
  }

  async function toggleResolved() {
    const r = await apiRequest("PATCH", `/api/board/document-comments/${comment.id}`, { resolved: !comment.resolved });
    if (r.success) {
      onUpdated({ ...comment, resolved: !comment.resolved });
    }
  }

  const indentClass = depth === 0 ? "" : depth === 1 ? "ml-6 pl-4 border-l-2 border-slate-100" : depth === 2 ? "ml-10 pl-4 border-l-2 border-slate-100" : "ml-14 pl-4 border-l-2 border-slate-100";

  return (
    <div className={`${indentClass} ${comment.resolved ? "opacity-60" : ""}`} data-testid={`comment-${comment.id}`}>
      <div className={`group bg-white border rounded-xl p-3 ${comment.resolved ? "border-slate-100" : "border-slate-200"} hover:border-slate-300 transition-colors`}>
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <Avatar authorId={comment.author_id} first={comment.first_name} last={comment.last_name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-[#0F172A]">{authorName(comment)}</span>
              <span className="text-[10px] text-slate-400">{fmtTime(comment.created_at)}</span>
              {comment.edited_at && <span className="text-[10px] text-slate-300">(edited)</span>}
              {comment.resolved && (
                <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              )}
            </div>

            {/* Body */}
            {editing ? (
              <div className="mt-2">
                <ComposeBox
                  placeholder="Edit your comment…"
                  onSubmit={saveEdit}
                  onCancel={() => setEditing(false)}
                  initialValue={comment.content}
                  autoFocus
                />
              </div>
            ) : (
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
            )}
          </div>

          {/* Actions (always visible on hover) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {/* Collapse replies */}
            {hasReplies && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                title={collapsed ? "Show replies" : "Collapse replies"}
                data-testid={`button-collapse-${comment.id}`}
              >
                {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
            {/* Resolve toggle (top-level only, admin or anyone) */}
            {depth === 0 && (
              <button
                onClick={toggleResolved}
                className={`p-1 rounded-lg transition-colors ${comment.resolved ? "text-green-500 hover:bg-green-50" : "text-slate-400 hover:bg-green-50 hover:text-green-500"}`}
                title={comment.resolved ? "Mark unresolved" : "Mark resolved"}
                data-testid={`button-resolve-${comment.id}`}
              >
                {comment.resolved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </button>
            )}
            {/* Reply */}
            {depth < maxDepth && (
              <button
                onClick={() => { setReplying(r => !r); setShowMenu(false); }}
                className="p-1 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                title="Reply"
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            )}
            {/* More menu */}
            {(canEdit || canDelete) && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(m => !m)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  data-testid={`button-menu-${comment.id}`}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[120px]" data-testid={`menu-${comment.id}`}>
                    {canEdit && (
                      <button
                        onClick={() => { setEditing(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                        data-testid={`button-edit-${comment.id}`}
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => { deleteComment(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 flex items-center gap-2 text-red-500"
                        data-testid={`button-delete-${comment.id}`}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply compose */}
        {replying && (
          <div className="mt-3 ml-10">
            <ComposeBox
              placeholder={`Replying to ${authorName(comment)}…`}
              onSubmit={postReply}
              onCancel={() => setReplying(false)}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {hasReplies && !collapsed && (
        <div className="mt-1.5 space-y-1.5">
          {comment.replies!.map(r => (
            <CommentNode
              key={r.id}
              comment={r}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
              documentId={documentId}
              onReplyPosted={onReplyPosted}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

interface Props {
  documentId: number;
  documentTitle?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export function DocumentDiscussion({ documentId, documentTitle, onClose, embedded = false }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flat, setFlat] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [searchQ, setSearchQ] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiRequest("GET", `/api/board/documents/${documentId}/comments`);
    if (r.success) setFlat(r.data ?? []);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { load(); }, [load]);

  // Inject a newly-posted comment into the flat list
  function addComment(c: Comment) {
    setFlat(prev => [...prev, c]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function updateComment(updated: Comment) {
    setFlat(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }

  function deleteComment(id: number) {
    setFlat(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
  }

  async function postTopLevel(text: string) {
    const r = await apiRequest("POST", `/api/board/documents/${documentId}/comments`, { content: text });
    if (r.success) {
      addComment(r.data);
    } else {
      toast({ title: "Failed to post", description: r.error, variant: "destructive" });
    }
  }

  const tree = buildTree(flat);

  // Filter tree
  const filtered = tree.filter(c => {
    if (filter === "open" && c.resolved) return false;
    if (filter === "resolved" && !c.resolved) return false;
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      const inRoot = c.content.toLowerCase().includes(q) || authorName(c).toLowerCase().includes(q);
      const inReplies = (c.replies ?? []).some(r => r.content.toLowerCase().includes(q) || authorName(r).toLowerCase().includes(q));
      if (!inRoot && !inReplies) return false;
    }
    return true;
  });

  const openCount = flat.filter(c => !c.parent_id && !c.resolved).length;
  const resolvedCount = flat.filter(c => !c.parent_id && c.resolved).length;
  const totalThreads = flat.filter(c => !c.parent_id).length;

  const currentUserId = user?.id ?? 0;
  const isAdmin = user?.role === "admin";

  const wrapClass = embedded
    ? "h-full flex flex-col"
    : "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4";

  return (
    <div className={wrapClass} onClick={!embedded && onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}>
      <div className={embedded ? "h-full flex flex-col" : "bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] rounded-t-2xl"}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-semibold text-[#0F172A] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-500" />
              Discussion
              {totalThreads > 0 && (
                <span className="text-xs bg-teal-100 text-teal-700 rounded-full px-2 py-0.5 font-medium">
                  {totalThreads}
                </span>
              )}
            </p>
            {documentTitle && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{documentTitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5 text-xs" data-testid="discussion-filter">
              {(["all", "open", "resolved"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md transition-colors capitalize font-medium ${filter === f ? "bg-white shadow-sm text-[#0F172A]" : "text-slate-500 hover:text-slate-700"}`}
                  data-testid={`filter-${f}`}
                >
                  {f === "all" ? `All (${totalThreads})` : f === "open" ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
                </button>
              ))}
            </div>
            {onClose && (
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" data-testid="button-close-discussion">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {flat.length > 3 && (
          <div className="px-5 py-2 border-b border-slate-50 shrink-0">
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search comments…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-300"
              data-testid="input-search-comments"
            />
          </div>
        )}

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {flat.length === 0
                  ? "No discussion yet — start the conversation below."
                  : searchQ ? "No comments match your search." : "No comments in this view."}
              </p>
            </div>
          ) : (
            filtered.map(c => (
              <CommentNode
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                depth={0}
                documentId={documentId}
                onReplyPosted={addComment}
                onUpdated={updateComment}
                onDeleted={deleteComment}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Compose new top-level comment */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
            <Avatar authorId={currentUserId} first={user?.firstName ?? null} last={user?.lastName ?? null} size="xs" />
            New thread
          </p>
          <ComposeBox
            placeholder="Start a discussion thread about this document…"
            onSubmit={postTopLevel}
          />
        </div>
      </div>
    </div>
  );
}

// ── Compact trigger button ────────────────────────────────────────────────────

export function DiscussionBadge({
  count,
  hasOpen,
  onClick,
  docId,
}: {
  count: number;
  hasOpen: boolean;
  onClick: () => void;
  docId: number;
}) {
  return (
    <button
      onClick={onClick}
      title="Open discussion"
      className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${
        hasOpen
          ? "text-teal-600 bg-teal-50 hover:bg-teal-100"
          : count > 0
          ? "text-slate-500 hover:bg-slate-100"
          : "text-slate-400 hover:bg-teal-50 hover:text-teal-600"
      }`}
      data-testid={`button-discussion-${docId}`}
    >
      <MessageSquare className="w-4 h-4" />
      {count > 0 && <span className="font-medium">{count}</span>}
    </button>
  );
}
