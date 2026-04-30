import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import {
  Plus, ArrowLeft, Kanban, X, Check, ChevronRight, Calendar, Flag,
  MessageSquare, Paperclip, Upload, Trash2, Pencil, Download, Image,
  FileText, Search, User, ClipboardList, Eye, ArrowRightLeft, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};
const PRIORITY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-400",
  medium: "border-l-yellow-400",
  low: "border-l-blue-400",
};
const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};
const LABEL_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0D7377", "#6366f1", "#ec4899", "#64748b"];

const INTEREST_LABELS: Record<number, { emoji: string; text: string; color: string }> = {
  0: { emoji: "😓", text: "This drains me — can we reassign it?", color: "text-red-500" },
  1: { emoji: "😕", text: "Not my favorite", color: "text-orange-500" },
  2: { emoji: "😐", text: "It's okay, I can do it", color: "text-yellow-600" },
  3: { emoji: "🙂", text: "I'm good with this", color: "text-teal-600" },
  4: { emoji: "😊", text: "I enjoy this kind of work", color: "text-teal-700" },
  5: { emoji: "🌟", text: "I'd love more work like this!", color: "text-green-600" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(u: { firstName?: string; lastName?: string } | null) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

function Avatar({ user, size = "sm", variant = "assignee" }: { user: any; size?: "sm" | "md" | "lg"; variant?: "assignee" | "reviewer" }) {
  const sz = size === "sm" ? "w-6 h-6 text-xs" : size === "md" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";
  const bg = variant === "reviewer" ? "bg-[#D4A843]" : "bg-[#0D7377]";
  const title = user ? `${user.firstName} ${user.lastName}${variant === "reviewer" ? " (Reviewer)" : ""}` : "";
  return (
    <div className={`${sz} ${bg} rounded-full text-white flex items-center justify-center font-bold shrink-0`} title={title}>
      {initials(user)}
    </div>
  );
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── User Picker (reusable for assignee + reviewer) ────────────────────────────

function UserPicker({ current, users, onSelect, onClose, label }: {
  current: any; users: any[]; onSelect: (u: any) => void; onClose: () => void; label: string;
}) {
  const [q, setQ] = useState("");
  const filtered = users.filter(u => !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="absolute z-20 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 w-64 overflow-hidden" data-testid="user-picker">
      <div className="p-2 border-b">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1.5">{label}</p>
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search members…" className="flex-1 bg-transparent text-sm focus:outline-none" data-testid="input-user-search" />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {current && (
          <button onClick={() => onSelect(null)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm text-red-500">
            <X className="w-4 h-4" /> Remove
          </button>
        )}
        {filtered.map(u => (
          <button key={u.id} onClick={() => onSelect(u)} className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm ${current?.id === u.id ? "bg-teal-50" : ""}`} data-testid={`option-user-${u.id}`}>
            <Avatar user={u} size="sm" />
            <div className="text-left">
              <p className="font-medium text-[#1A1F2B] leading-none">{u.firstName} {u.lastName}</p>
              <p className="text-xs text-slate-400">{u.role}</p>
            </div>
            {current?.id === u.id && <Check className="w-3.5 h-3.5 text-[#0D7377] ml-auto" />}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-slate-400 px-3 py-2">No members found</p>}
      </div>
      <div className="p-2 border-t">
        <button onClick={onClose} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">Close</button>
      </div>
    </div>
  );
}

// ── Interest Rating Picker ─────────────────────────────────────────────────────

function InterestRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">My Interest Level</p>
      <div className="space-y-1">
        {[0, 1, 2, 3, 4, 5].map(n => {
          const info = INTEREST_LABELS[n];
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(selected ? null : n)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors text-xs ${selected ? "bg-teal-50 border border-[#0D7377]/30" : "hover:bg-slate-50 border border-transparent"}`}
              data-testid={`interest-${n}`}
            >
              <span className="text-base leading-none w-5">{info.emoji}</span>
              <span className={`flex-1 ${selected ? info.color : "text-slate-600"} font-medium`}>{n} — {info.text}</span>
              {selected && <Check className="w-3 h-3 text-[#0D7377] shrink-0" />}
            </button>
          );
        })}
        {value !== null && (
          <button onClick={() => onChange(null)} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 text-center">
            Clear rating
          </button>
        )}
      </div>
    </div>
  );
}

// ── Card Detail Modal ─────────────────────────────────────────────────────────

function CardDetailModal({ cardId, users, currentUserId, onClose, onUpdated }: {
  cardId: number; users: any[]; currentUserId: number; onClose: () => void; onUpdated: () => void;
}) {
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState("");
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showReviewerPicker, setShowReviewerPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [editingLabels, setEditingLabels] = useState(false);
  const [showInterest, setShowInterest] = useState(false);
  const [showMoveToBoard, setShowMoveToBoard] = useState(false);
  const [allBoards, setAllBoards] = useState<any[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState<number | null>(null);
  const [moveTargetColumns, setMoveTargetColumns] = useState<any[]>([]);
  const [moveTargetColumnId, setMoveTargetColumnId] = useState<number | null>(null);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const res = await apiRequest("GET", `/api/kanban/cards/${cardId}`);
    if (res.success) { setCard(res.data); setTitleVal(res.data.title); setDescVal(res.data.description || ""); }
    setLoading(false);
  }, [cardId]);

  useEffect(() => { reload(); }, [reload]);

  async function patch(fields: any) {
    await apiRequest("PATCH", `/api/kanban/cards/${cardId}`, fields);
    await reload();
    onUpdated();
  }

  async function saveTitle() {
    if (titleVal.trim() && titleVal !== card.title) await patch({ title: titleVal.trim() });
    setEditingTitle(false);
  }

  async function saveDesc() {
    await patch({ description: descVal.trim() || null });
    setEditingDesc(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    await apiRequest("POST", `/api/kanban/cards/${cardId}/comments`, { content: commentText.trim() });
    setCommentText("");
    await reload();
    onUpdated();
  }

  async function saveEditComment(id: number) {
    if (!editCommentText.trim()) return;
    await apiRequest("PATCH", `/api/kanban/comments/${id}`, { content: editCommentText.trim() });
    setEditingComment(null);
    await reload();
    onUpdated();
  }

  async function deleteComment(id: number) {
    if (!confirm("Delete this comment?")) return;
    await apiRequest("DELETE", `/api/kanban/comments/${id}`);
    await reload();
    onUpdated();
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/kanban/cards/${cardId}/attachments`, { method: "POST", body: fd, credentials: "include" });
    }
    await reload();
    setUploading(false);
    onUpdated();
  }

  async function deleteAttachment(id: number) {
    if (!confirm("Delete this attachment?")) return;
    await apiRequest("DELETE", `/api/kanban/attachments/${id}`);
    await reload();
  }

  async function addLabel() {
    if (!labelInput.trim() || !card) return;
    const labels = [...(card.labels || []), labelInput.trim()];
    await patch({ labels });
    setLabelInput("");
  }

  async function removeLabel(l: string) {
    await patch({ labels: (card.labels || []).filter((x: string) => x !== l) });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }

  async function openMovePanel() {
    setShowMoveToBoard(true);
    setMoveTargetBoardId(null);
    setMoveTargetColumns([]);
    setMoveTargetColumnId(null);
    setBoardsLoading(true);
    const res = await apiRequest("GET", "/api/kanban/boards");
    if (res.success) setAllBoards(res.data);
    setBoardsLoading(false);
  }

  async function selectTargetBoard(boardId: number) {
    setMoveTargetBoardId(boardId);
    setMoveTargetColumnId(null);
    setMoveTargetColumns([]);
    setColumnsLoading(true);
    const res = await apiRequest("GET", `/api/kanban/boards/${boardId}`);
    if (res.success) setMoveTargetColumns(res.data.columns || []);
    setColumnsLoading(false);
  }

  async function executeMove() {
    if (!moveTargetBoardId || !moveTargetColumnId) return;
    setMoving(true);
    await apiRequest("PATCH", `/api/kanban/cards/${cardId}`, {
      boardId: moveTargetBoardId,
      columnId: moveTargetColumnId,
    });
    setMoving(false);
    onUpdated();
    onClose();
  }

  if (loading || !card) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-96 animate-pulse" />
      </div>
    );
  }

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();
  const myInterest = card.interestRating !== null && card.interestRating !== undefined ? INTEREST_LABELS[card.interestRating] : null;
  const isMyCard = card.assignedTo === currentUserId || card.reviewerId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 px-4 pb-6 overflow-y-auto bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose(); }} data-testid="card-detail-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto" onDrop={onDrop} onDragOver={e => e.preventDefault()}>
        {/* Header */}
        <div className={`rounded-t-2xl px-6 pt-5 pb-4 border-b border-slate-100 ${PRIORITY_BORDER[card.priority]} border-l-4`}>
          <div className="flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[card.priority] || "bg-slate-300"}`} />
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                  onBlur={saveTitle} onKeyDown={e => e.key === "Enter" && saveTitle()}
                  className="w-full text-lg font-semibold text-[#1A1F2B] border-b-2 border-[#0D7377] outline-none bg-transparent" data-testid="input-card-title" />
              ) : (
                <h2 className="text-lg font-semibold text-[#1A1F2B] cursor-pointer hover:text-[#0D7377] transition-colors" onClick={() => setEditingTitle(true)} data-testid="text-card-title">{card.title}</h2>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                Created by {card.creator ? `${card.creator.firstName} ${card.creator.lastName}` : "unknown"} · {relTime(card.createdAt)}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0" data-testid="button-close-card"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex gap-0 flex-col md:flex-row">
          {/* Main content */}
          <div className="flex-1 p-6 space-y-5 min-w-0">

            {/* Interest Rating — only show to assignee/reviewer */}
            {isMyCard && (
              <div className="bg-slate-50 rounded-xl p-3">
                <button className="w-full flex items-center justify-between" onClick={() => setShowInterest(v => !v)} data-testid="button-toggle-interest">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{myInterest ? myInterest.emoji : "—"}</span>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-600">My Interest Level</p>
                      {myInterest ? (
                        <p className={`text-xs ${myInterest.color}`}>{card.interestRating} — {myInterest.text}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tap to rate your interest in this task</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showInterest ? "rotate-90" : ""}`} />
                </button>
                {showInterest && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <InterestRating value={card.interestRating ?? null} onChange={async v => { await patch({ interestRating: v }); setShowInterest(false); }} />
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</h4>
                {!editingDesc && <button onClick={() => setEditingDesc(true)} className="text-xs text-[#0D7377] hover:underline" data-testid="button-edit-desc"><Pencil className="w-3 h-3 inline mr-0.5" />Edit</button>}
              </div>
              {editingDesc ? (
                <div>
                  <textarea autoFocus value={descVal} onChange={e => setDescVal(e.target.value)} rows={4} placeholder="Add a description…" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none" data-testid="textarea-card-desc" />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" className="bg-[#0D7377] text-white h-7 text-xs" onClick={saveDesc} data-testid="button-save-desc">Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingDesc(false); setDescVal(card.description || ""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${card.description ? "text-slate-600" : "text-slate-300 italic"} cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2`} onClick={() => setEditingDesc(true)} data-testid="text-card-desc">
                  {card.description || "Click to add a description…"}
                </p>
              )}
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Attachments {card.attachments?.length > 0 && <Badge variant="secondary" className="text-xs">{card.attachments.length}</Badge>}</h4>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-attach-file">
                  {uploading ? "Uploading…" : <><Upload className="w-3 h-3" /> Attach</>}
                </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} data-testid="input-file-upload" />
              </div>
              {card.attachments?.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-300 text-xs cursor-pointer hover:border-[#0D7377]/40 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-5 h-5 mx-auto mb-1" /> Drop files here or click to upload
                </div>
              )}
              {card.attachments?.length > 0 && (
                <div className="space-y-2">
                  {card.attachments.map((att: any) => (
                    <div key={att.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2.5 group" data-testid={`attachment-${att.id}`}>
                      {isImage(att.mimeType) ? (
                        <a href={`/api/kanban/attachments/${att.id}/preview`} target="_blank" rel="noreferrer" className="shrink-0">
                          <img src={`/api/kanban/attachments/${att.id}/preview`} alt={att.fileName} className="w-12 h-12 object-cover rounded-md border border-slate-200" />
                        </a>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1F2B] truncate">{att.fileName}</p>
                        <p className="text-xs text-slate-400">{fmtBytes(att.fileSize)} · {att.firstName} {att.lastName} · {relTime(att.createdAt)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={`/api/kanban/attachments/${att.id}/download`} download className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-[#0D7377]" data-testid={`button-download-${att.id}`}><Download className="w-4 h-4" /></a>
                        {(att.uploadedBy === currentUserId) && (
                          <button onClick={() => deleteAttachment(att.id)} className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-red-500" data-testid={`button-delete-att-${att.id}`}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <MessageSquare className="w-3.5 h-3.5" /> Discussion
                {card.comments?.length > 0 && <Badge variant="secondary" className="text-xs">{card.comments.length}</Badge>}
              </h4>
              <div className="space-y-3">
                {card.comments?.map((c: any) => (
                  <div key={c.id} className="flex gap-2.5 group" data-testid={`comment-${c.id}`}>
                    <Avatar user={c} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-[#1A1F2B]">{c.firstName} {c.lastName}</span>
                        <span className="text-xs text-slate-400">{relTime(c.createdAt)}{c.editedAt && " (edited)"}</span>
                      </div>
                      {editingComment === c.id ? (
                        <div className="mt-1">
                          <textarea autoFocus value={editCommentText} onChange={e => setEditCommentText(e.target.value)} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none" data-testid="textarea-edit-comment" />
                          <div className="flex gap-2 mt-1">
                            <Button size="sm" className="bg-[#0D7377] text-white h-6 text-xs" onClick={() => saveEditComment(c.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingComment(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap" data-testid={`text-comment-${c.id}`}>{c.content}</p>
                      )}
                      {c.userId === currentUserId && editingComment !== c.id && (
                        <div className="flex gap-2 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-xs text-slate-400 hover:text-[#0D7377]" onClick={() => { setEditingComment(c.id); setEditCommentText(c.content); }} data-testid={`button-edit-comment-${c.id}`}>Edit</button>
                          <button className="text-xs text-slate-400 hover:text-red-500" onClick={() => deleteComment(c.id)} data-testid={`button-delete-comment-${c.id}`}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={submitComment} className="flex gap-2 mt-3">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-card-comment" />
                <Button type="submit" size="sm" className="bg-[#0D7377] text-white" disabled={!commentText.trim()} data-testid="button-add-comment">Post</Button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-52 shrink-0 bg-slate-50 rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none p-4 space-y-4 border-t md:border-t-0 md:border-l border-slate-100">

            {/* Assignee */}
            <div className="relative">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Owner</p>
              <button className="w-full flex items-center gap-2 text-sm text-left bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-[#0D7377]/50 transition-colors" onClick={() => { setShowAssigneePicker(v => !v); setShowReviewerPicker(false); }} data-testid="button-assignee-picker">
                {card.assignee ? (
                  <><Avatar user={card.assignee} size="sm" variant="assignee" /><span className="truncate">{card.assignee.firstName} {card.assignee.lastName}</span></>
                ) : (
                  <><User className="w-4 h-4 text-slate-300" /><span className="text-slate-400">Unassigned</span></>
                )}
              </button>
              {showAssigneePicker && (
                <UserPicker label="Assign Owner" current={card.assignee} users={users} onSelect={async u => { await patch({ assignedTo: u?.id || null }); setShowAssigneePicker(false); }} onClose={() => setShowAssigneePicker(false)} />
              )}
            </div>

            {/* Reviewer */}
            <div className="relative">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Reviewer
              </p>
              <button className="w-full flex items-center gap-2 text-sm text-left bg-white border border-slate-200 rounded-lg px-2.5 py-2 hover:border-[#D4A843]/50 transition-colors" onClick={() => { setShowReviewerPicker(v => !v); setShowAssigneePicker(false); }} data-testid="button-reviewer-picker">
                {card.reviewer ? (
                  <><Avatar user={card.reviewer} size="sm" variant="reviewer" /><span className="truncate">{card.reviewer.firstName} {card.reviewer.lastName}</span></>
                ) : (
                  <><Eye className="w-4 h-4 text-slate-300" /><span className="text-slate-400">No reviewer</span></>
                )}
              </button>
              {showReviewerPicker && (
                <UserPicker label="Assign Reviewer" current={card.reviewer} users={users} onSelect={async u => { await patch({ reviewerId: u?.id || null }); setShowReviewerPicker(false); }} onClose={() => setShowReviewerPicker(false)} />
              )}
              <p className="text-xs text-slate-400 mt-1 leading-tight">Reviewer appears in My Tasks when card enters "In Review"</p>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Priority</p>
              <select value={card.priority} onChange={e => patch({ priority: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="select-card-priority">
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</p>
              <input type="date" value={card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""} onChange={e => patch({ dueDate: e.target.value || null })} className={`w-full text-sm border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 ${isOverdue ? "border-red-300 text-red-600" : "border-slate-200"}`} data-testid="input-card-due-date" />
              {isOverdue && <p className="text-xs text-red-500 mt-0.5">Overdue!</p>}
            </div>

            {/* Labels */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Labels</p>
                <button onClick={() => setEditingLabels(v => !v)} className="text-xs text-[#0D7377]">{editingLabels ? "Done" : "Edit"}</button>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {(card.labels || []).map((l: string) => (
                  <span key={l} className="inline-flex items-center gap-0.5 text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5" data-testid={`label-${l}`}>
                    {l}{editingLabels && <button onClick={() => removeLabel(l)} className="ml-0.5 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>}
                  </span>
                ))}
              </div>
              {editingLabels && (
                <div className="flex gap-1">
                  <input value={labelInput} onChange={e => setLabelInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLabel())} placeholder="Add label…" className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0D7377]/30" data-testid="input-label" />
                  <Button size="sm" variant="outline" className="h-6 px-2" onClick={addLabel}><Plus className="w-3 h-3" /></Button>
                </div>
              )}
            </div>

            {/* Move to Board */}
            <div className="pt-2 border-t border-slate-200">
              {!showMoveToBoard ? (
                <button
                  onClick={openMovePanel}
                  className="w-full text-xs text-[#0D7377] hover:text-[#0D7377]/80 flex items-center gap-1.5 py-1 font-medium"
                  data-testid="button-move-to-board"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Move to another board
                </button>
              ) : (
                <div className="space-y-2" data-testid="move-to-board-panel">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Move to Board</p>
                    <button onClick={() => setShowMoveToBoard(false)} className="text-slate-400 hover:text-slate-600" data-testid="button-close-move-panel">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Board picker */}
                  {boardsLoading ? (
                    <div className="h-8 bg-slate-200 rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={moveTargetBoardId ?? ""}
                      onChange={e => e.target.value ? selectTargetBoard(Number(e.target.value)) : setMoveTargetBoardId(null)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                      data-testid="select-target-board"
                    >
                      <option value="">Select board…</option>
                      {allBoards.filter(b => b.id !== card.boardId).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Column picker */}
                  {moveTargetBoardId && (
                    columnsLoading ? (
                      <div className="h-8 bg-slate-200 rounded-lg animate-pulse" />
                    ) : (
                      <select
                        value={moveTargetColumnId ?? ""}
                        onChange={e => setMoveTargetColumnId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                        data-testid="select-target-column"
                      >
                        <option value="">Select column…</option>
                        {moveTargetColumns.map((col: any) => (
                          <option key={col.id} value={col.id}>{col.title}</option>
                        ))}
                      </select>
                    )
                  )}

                  {/* Move button */}
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs bg-[#0D7377] text-white"
                    disabled={!moveTargetBoardId || !moveTargetColumnId || moving}
                    onClick={executeMove}
                    data-testid="button-confirm-move"
                  >
                    {moving ? "Moving…" : <><ArrowRightLeft className="w-3 h-3 mr-1" />Move card</>}
                  </Button>
                </div>
              )}
            </div>

            {/* Archive */}
            <div className="pt-2 border-t border-slate-200">
              <button onClick={async () => { if (confirm("Archive this card?")) { await patch({ archived: true }); onClose(); onUpdated(); } }} className="w-full text-xs text-red-400 hover:text-red-600 flex items-center gap-1.5 py-1" data-testid="button-archive-card">
                <Trash2 className="w-3.5 h-3.5" /> Archive card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── My Tasks View ─────────────────────────────────────────────────────────────

function MyTasksView({ onOpenCard, onOpenBoard }: { onOpenCard: (id: number, boardId: number) => void; onOpenBoard: (id: number) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "owner" | "reviewer">("all");

  useEffect(() => {
    apiRequest("GET", "/api/kanban/my-tasks").then(r => {
      if (r.success) setTasks(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = tasks.filter(t => {
    if (filter === "owner") return t.role === "assignee" || t.role === "both";
    if (filter === "reviewer") return t.role === "reviewer" || t.role === "both";
    return true;
  });

  const overdue = filtered.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
  const upcoming = filtered.filter(t => !(t.dueDate && new Date(t.dueDate) < new Date()));

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["all", "owner", "reviewer"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${filter === f ? "bg-[#0D7377] text-white border-[#0D7377]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`filter-tasks-${f}`}>
            {f === "all" ? "All My Tasks" : f === "owner" ? "I Own" : "I'm Reviewing"}
            <span className="ml-1.5 text-xs opacity-70">
              {f === "all" ? tasks.length : tasks.filter(t => f === "owner" ? (t.role === "assignee" || t.role === "both") : (t.role === "reviewer" || t.role === "both")).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks here</p>
          <p className="text-xs mt-1">Tasks assigned to you or that need your review will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">⚠ Overdue ({overdue.length})</p>
              <div className="space-y-2">
                {overdue.map(task => <TaskRow key={task.id} task={task} onOpen={() => onOpenCard(task.id, task.boardId)} onOpenBoard={() => onOpenBoard(task.boardId)} />)}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              {overdue.length > 0 && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Upcoming ({upcoming.length})</p>}
              <div className="space-y-2">
                {upcoming.map(task => <TaskRow key={task.id} task={task} onOpen={() => onOpenCard(task.id, task.boardId)} onOpenBoard={() => onOpenBoard(task.boardId)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onOpen, onOpenBoard }: { task: any; onOpen: () => void; onOpenBoard: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const myInterest = task.interestRating !== null && task.interestRating !== undefined ? INTEREST_LABELS[task.interestRating] : null;

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${PRIORITY_BORDER[task.priority] || "border-l-slate-200"} hover:shadow-md transition-shadow cursor-pointer group`} onClick={onOpen} data-testid={`my-task-${task.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-[#1A1F2B] line-clamp-1">{task.title}</p>
            {(task.role === "reviewer" || task.role === "both") && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                <Eye className="w-3 h-3" /> Reviewer
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <button onClick={e => { e.stopPropagation(); onOpenBoard(); }} className="flex items-center gap-1 hover:text-[#0D7377] transition-colors">
              <Kanban className="w-3 h-3" />{task.board?.name || "Board"}
            </button>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: task.column?.color || "#64748b" }} />
              {task.column?.title || "—"}
            </span>
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                <Calendar className="w-3 h-3" />
                {isOverdue ? "Overdue: " : ""}{new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {myInterest && (
              <span className={`${myInterest.color} flex items-center gap-0.5`}>
                {myInterest.emoji} {task.interestRating}/5
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || ""}`}>{task.priority}</span>
          {task.assignee && <Avatar user={task.assignee} size="sm" variant="assignee" />}
          {task.reviewer && <Avatar user={task.reviewer} size="sm" variant="reviewer" />}
        </div>
      </div>
    </div>
  );
}

// ── Main Kanban Content ───────────────────────────────────────────────────────

function KanbanContent() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [view, setView] = useState<"boards" | "my-tasks">("boards");

  useEffect(() => {
    document.title = "Kanban | handləkraft.ai";
    loadBoards();
    apiRequest("GET", "/api/kanban/users").then(r => { if (r.success) setPortalUsers(r.data); });
  }, []);

  async function loadBoards() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/kanban/boards");
    if (res.success) setBoards(res.data);
    setLoading(false);
  }

  async function loadBoard(id: number) {
    const res = await apiRequest("GET", `/api/kanban/boards/${id}`);
    if (res.success) { setActiveBoard(res.data); setView("boards"); }
  }

  async function createBoard() {
    if (!newBoardName.trim()) return;
    const res = await apiRequest("POST", "/api/kanban/boards", { name: newBoardName });
    if (res.success) { setBoards(prev => [...prev, res.data]); setNewBoardName(""); setShowNewBoard(false); }
  }

  async function addCard(columnId: number, boardId: number) {
    if (!newCardTitle.trim()) return;
    const res = await apiRequest("POST", "/api/kanban/cards", { columnId, boardId, title: newCardTitle });
    if (res.success) { setNewCardTitle(""); setAddingCard(null); loadBoard(boardId); }
  }

  async function addColumn() {
    const title = prompt("Column name:");
    if (!title || !activeBoard) return;
    await apiRequest("POST", `/api/kanban/boards/${activeBoard.id}/columns`, { title });
    loadBoard(activeBoard.id);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination || !activeBoard) return;
    const { draggableId, destination } = result;
    const cardId = parseInt(draggableId);
    const newColumnId = parseInt(destination.droppableId);
    const newPosition = destination.index;
    const newBoard = { ...activeBoard, columns: activeBoard.columns.map((col: any) => ({ ...col, cards: col.cards.filter((c: any) => c.id !== cardId) })) };
    const card = activeBoard.columns.flatMap((c: any) => c.cards).find((c: any) => c.id === cardId);
    if (card) {
      const targetCol = newBoard.columns.find((c: any) => c.id === newColumnId);
      if (targetCol) targetCol.cards.splice(newPosition, 0, { ...card, columnId: newColumnId });
    }
    setActiveBoard(newBoard);
    await apiRequest("PATCH", `/api/kanban/cards/${cardId}`, { columnId: newColumnId, position: newPosition });
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>;

  // Board view
  if (activeBoard) return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={() => setActiveBoard(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm" data-testid="button-back-boards">
          <ArrowLeft className="w-4 h-4" /> Boards
        </button>
        <h1 className="text-lg font-display text-[#1A1F2B]">{activeBoard.name}</h1>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {activeBoard.columns?.map((col: any) => (
            <div key={col.id} className="shrink-0 w-72 flex flex-col" data-testid={`kanban-column-${col.id}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold text-slate-700">{col.title}</span>
                  <Badge variant="secondary" className="text-xs">{col.cards?.length || 0}</Badge>
                </div>
              </div>
              <Droppable droppableId={String(col.id)}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-xl p-2 min-h-[200px] space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-[#0D7377]/10" : "bg-slate-100"}`}>
                    {col.cards?.map((card: any, index: number) => (
                      <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer border-l-4 ${PRIORITY_BORDER[card.priority] || "border-l-slate-200"} hover:shadow-md transition-shadow ${snapshot.isDragging ? "shadow-lg rotate-1" : ""} ${card.dueDate && new Date(card.dueDate) < new Date() ? "ring-1 ring-red-300" : ""}`}
                            onClick={() => setSelectedCardId(card.id)} data-testid={`kanban-card-${card.id}`}
                          >
                            {/* Labels */}
                            {card.labels?.length > 0 && (
                              <div className="flex gap-1 flex-wrap mb-1.5">
                                {card.labels.map((l: string) => (
                                  <span key={l} className="text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">{l}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-sm font-medium text-[#1A1F2B] line-clamp-2">{card.title}</p>
                            {/* Footer row */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[card.priority] || ""}`}>{card.priority}</span>
                              {card.dueDate && (
                                <span className={`text-xs flex items-center gap-0.5 ${new Date(card.dueDate) < new Date() ? "text-red-500" : "text-slate-400"}`}>
                                  <Calendar className="w-3 h-3" />{new Date(card.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              <div className="flex items-center gap-1 ml-auto">
                                {card.commentCount > 0 && (
                                  <span className="text-xs text-slate-400 flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{card.commentCount}</span>
                                )}
                                {card.attachmentCount > 0 && (
                                  <span className="text-xs text-slate-400 flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{card.attachmentCount}</span>
                                )}
                                {card.interestRating !== null && card.interestRating !== undefined && (
                                  <span className="text-xs" title={`Interest: ${card.interestRating}/5`}>{INTEREST_LABELS[card.interestRating]?.emoji}</span>
                                )}
                                {/* Reviewer dot (yellow) */}
                                {card.reviewer && <Avatar user={card.reviewer} size="sm" variant="reviewer" />}
                                {/* Assignee dot (teal) */}
                                {card.assignee && <Avatar user={card.assignee} size="sm" variant="assignee" />}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {addingCard === col.id ? (
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <textarea autoFocus value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="Card title…" rows={2} className="w-full text-sm border-0 outline-none resize-none" data-testid="input-new-card-title"
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCard(col.id, activeBoard.id); } }} />
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" className="bg-[#0D7377] text-white text-xs h-7" onClick={() => addCard(col.id, activeBoard.id)} data-testid="button-save-card"><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setAddingCard(null); setNewCardTitle(""); }}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingCard(col.id)} className="w-full text-left text-sm text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-white transition-colors flex items-center gap-1" data-testid={`button-add-card-${col.id}`}>
                        <Plus className="w-3 h-3" /> Add card
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
        <div className="shrink-0 w-12 flex items-start justify-center pt-10">
          <button onClick={addColumn} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-[#0D7377] hover:shadow-md transition-all" data-testid="button-add-column">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          users={portalUsers}
          currentUserId={user?.id || 0}
          onClose={() => setSelectedCardId(null)}
          onUpdated={() => loadBoard(activeBoard.id)}
        />
      )}
    </div>
  );

  // Board list + My Tasks
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Kanban Boards</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your battle plans, organized by the gods.</p>
        </div>
        {view === "boards" && (
          <Button onClick={() => setShowNewBoard(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-board"><Plus className="w-4 h-4" /> New Board</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        <button onClick={() => setView("boards")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${view === "boards" ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid="tab-boards">
          <Kanban className="w-4 h-4" /> All Boards <span className="text-xs">{boards.length}</span>
        </button>
        <button onClick={() => setView("my-tasks")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${view === "my-tasks" ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid="tab-my-tasks">
          <ClipboardList className="w-4 h-4" /> My Tasks
        </button>
      </div>

      {view === "my-tasks" ? (
        <MyTasksView
          onOpenCard={(cardId, boardId) => { loadBoard(boardId).then(() => setSelectedCardId(cardId)); }}
          onOpenBoard={loadBoard}
        />
      ) : (
        <>
          {showNewBoard && (
            <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
              <CardContent className="pt-4 flex gap-2">
                <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Board name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" onKeyDown={e => e.key === "Enter" && createBoard()} data-testid="input-board-name" />
                <Button onClick={createBoard} className="bg-[#0D7377] text-white" data-testid="button-create-board"><Check className="w-4 h-4" /></Button>
                <Button variant="outline" onClick={() => setShowNewBoard(false)}><X className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-slate-400"><Kanban className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No boards yet. Create your first board to organize work.</p></div>
            ) : boards.map((board: any) => (
              <Card key={board.id} className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm" onClick={() => loadBoard(board.id)} data-testid={`card-board-${board.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[#1A1F2B]">{board.name}</h3>
                      {board.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{board.description}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          users={portalUsers}
          currentUserId={user?.id || 0}
          onClose={() => setSelectedCardId(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}

export default function EmployeeKanban() {
  return (
    <PortalGuard allowedRoles={["admin", "employee", "student"]}>
      <EmployeeLayout><KanbanContent /></EmployeeLayout>
    </PortalGuard>
  );
}
