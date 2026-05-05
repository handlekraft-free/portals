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
  Sparkles, Loader2, Ship, Anchor, FileUp, FileDown, Info, Heart, Star, Crown, Coins,
} from "lucide-react";
import { VikingCrossedSwords } from "@/components/portal/VikingDecor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { isCompletionColumn, xpForPriority, INITIATIVE_MULTIPLIER } from "@shared/xp";
import { motion, AnimatePresence } from "framer-motion";

// Tiny hook that respects the OS reduced-motion preference.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

// Wax-seal-styled priority indicator. Calm dot + initial.
const WAX_SEAL_BG: Record<string, string> = {
  urgent: "bg-red-600",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};
function WaxSeal({ priority }: { priority: string }) {
  const letter = (priority?.[0] || "?").toUpperCase();
  return (
    <div
      title={`Priority: ${priority}`}
      className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white/70 ${WAX_SEAL_BG[priority] || "bg-slate-400"}`}
      data-testid={`wax-seal-${priority}`}
    >
      {letter}
    </div>
  );
}

function InterestFitStars({ score }: { score: number }) {
  const s = Math.max(1, Math.min(5, Math.round(score)));
  return (
    <div className="flex items-center gap-0.5" title={`Interest fit ${s}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= s ? "text-[#D4A843] fill-[#D4A843]" : "text-slate-300"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

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
  const [showAskClaude, setShowAskClaude] = useState(false);
  const [claudeQuestion, setClaudeQuestion] = useState("");
  const [claudeAdvice, setClaudeAdvice] = useState("");
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeError, setClaudeError] = useState("");
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

  async function askClaude() {
    if (!card) return;
    setClaudeLoading(true);
    setClaudeAdvice("");
    setClaudeError("");
    const assigneeName = card.assignee ? `${card.assignee.firstName} ${card.assignee.lastName}` : "";
    try {
      const res = await apiRequest("POST", "/api/ai/task-advice", {
        title: card.title,
        description: card.description || "",
        priority: card.priority,
        dueDate: card.dueDate || null,
        labels: card.labels || [],
        assigneeName,
        question: claudeQuestion.trim(),
      });
      if (res.success) {
        setClaudeAdvice(res.data.advice);
      } else {
        setClaudeError(res.error || "Something went wrong. Please try again.");
      }
    } catch {
      setClaudeError("Could not reach the AI service. Please try again.");
    }
    setClaudeLoading(false);
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

            {/* Ask Claude */}
            <div className={`rounded-xl border transition-colors ${showAskClaude ? "border-[#0D7377]/40 bg-teal-50/50" : "border-slate-200 bg-slate-50"}`}>
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => { setShowAskClaude(v => !v); if (!showAskClaude) { setClaudeAdvice(""); setClaudeError(""); setClaudeQuestion(""); } }}
                data-testid="button-toggle-ask-claude"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 shrink-0 ${showAskClaude ? "text-[#0D7377]" : "text-slate-400"}`} />
                  <div>
                    <p className={`text-sm font-semibold ${showAskClaude ? "text-[#0D7377]" : "text-slate-600"}`}>Ask Claude for help</p>
                    {!showAskClaude && <p className="text-xs text-slate-400">Get beginner-friendly advice on how to tackle this task</p>}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${showAskClaude ? "rotate-90" : ""}`} />
              </button>

              {showAskClaude && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#0D7377]/20">
                  <p className="text-xs text-slate-500 pt-3 leading-relaxed">
                    Claude will read this card's title, description, priority, due date, and labels, then give you friendly advice on how to get started — written for beginners. Nothing will change on the card.
                  </p>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Got a specific question? <span className="font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={claudeQuestion}
                      onChange={e => setClaudeQuestion(e.target.value)}
                      placeholder="e.g. What tools should I use? Where do I start?"
                      rows={2}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none bg-white"
                      data-testid="textarea-claude-question"
                    />
                  </div>

                  <Button
                    onClick={askClaude}
                    disabled={claudeLoading}
                    className="w-full bg-[#0D7377] hover:bg-[#0D7377]/90 text-white gap-2"
                    data-testid="button-get-claude-advice"
                  >
                    {claudeLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Get Advice</>
                    )}
                  </Button>

                  {claudeError && (
                    <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="text-claude-error">{claudeError}</p>
                  )}

                  {claudeAdvice && (
                    <div className="bg-white border border-[#0D7377]/20 rounded-xl p-4 space-y-2" data-testid="text-claude-advice">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#0D7377]" />
                        <p className="text-xs font-semibold text-[#0D7377] uppercase tracking-wider">Claude's Advice</p>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{claudeAdvice}</div>
                      <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 mt-2">
                        AI-generated suggestions only — use your own judgment. Nothing on this card was changed.
                      </p>
                      <button
                        onClick={() => { setClaudeAdvice(""); setClaudeQuestion(""); }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                        data-testid="button-clear-claude-advice"
                      >
                        Clear advice
                      </button>
                    </div>
                  )}
                </div>
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

            {/* Peer Review Approval */}
            {(() => {
              const isReviewer = currentUserId === card.reviewerId;
              const approved = !!(card.reviewApproved ?? card.review_approved);
              const reviewedAt = card.reviewedAt ?? card.reviewed_at;
              return (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Peer Review
                  </p>
                  <label
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${approved ? "bg-green-50 border-green-200" : "bg-white border-slate-200"} ${isReviewer ? "cursor-pointer hover:border-green-300" : "cursor-default"}`}
                    data-testid="label-review-approval"
                  >
                    <input
                      type="checkbox"
                      checked={approved}
                      disabled={!isReviewer}
                      onChange={async () => {
                        if (!isReviewer) return;
                        await patch({ reviewApproved: !approved });
                      }}
                      className="mt-0.5 w-4 h-4 rounded accent-green-600"
                      data-testid="checkbox-review-approved"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${approved ? "text-green-700" : "text-slate-600"}`}>
                        {approved ? "Review approved ✓" : "Approve review"}
                      </span>
                      {approved && reviewedAt && (
                        <p className="text-xs text-green-600 mt-0.5">{relTime(reviewedAt)}</p>
                      )}
                      {!isReviewer && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                          {card.reviewer ? `${card.reviewer.firstName} ${card.reviewer.lastName} must approve` : "Assign a reviewer first"}
                        </p>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-amber-600 mt-1 leading-tight flex items-center gap-1">
                    <Flag className="w-3 h-3 shrink-0" /> Required to move to Done (Valhalla)
                  </p>
                </div>
              );
            })()}

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

// ── Longship Factory ──────────────────────────────────────────────────────────

function ClaimModal({ card, boards, onClose, onClaimed, claimerName }: {
  card: any; boards: any[]; onClose: () => void; onClaimed: () => void; claimerName?: string;
}) {
  const { toast } = useToast();
  const [targetBoardId, setTargetBoardId] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");
  const [boardColumns, setBoardColumns] = useState<any[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [stamped, setStamped] = useState(false);
  const reduced = usePrefersReducedMotion();
  const nonFactoryBoards = boards.filter((b: any) => !b.isLongshipFactory);

  useEffect(() => {
    if (!targetBoardId) { setBoardColumns([]); setTargetColumnId(""); return; }
    setLoadingCols(true);
    apiRequest("GET", `/api/kanban/boards/${targetBoardId}`).then(r => {
      if (r.success) setBoardColumns(r.data.columns || []);
      setLoadingCols(false);
    });
  }, [targetBoardId]);

  async function doClaim() {
    setClaiming(true);
    const body: any = {};
    if (targetBoardId && targetColumnId) {
      body.targetBoardId = parseInt(targetBoardId);
      body.targetColumnId = parseInt(targetColumnId);
    }
    const res = await apiRequest("POST", `/api/kanban/cards/${card.id}/claim`, body);
    setClaiming(false);
    if (res.success) {
      // Brief sword-stamp; reduced-motion users get an instant close.
      if (reduced) {
        toast({ title: "Quest claimed", description: targetBoardId ? "Moved to your board." : "Assigned to you in the Factory." });
        onClaimed();
        return;
      }
      setStamped(true);
      toast({ title: "Quest claimed! ⚔️", description: targetBoardId ? "Moved to your board." : "Assigned to you in the Factory." });
      setTimeout(() => onClaimed(), 600);
    } else {
      toast({ title: "Failed to claim", description: res.error, variant: "destructive" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative overflow-hidden bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-[#0D7377]" />
            <h2 className="text-lg font-display text-[#1A1F2B]">Claim This Quest</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className={`rounded-xl border-l-4 ${PRIORITY_BORDER[card.priority] || "border-l-slate-200"} bg-slate-50 p-4 mb-5`}>
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[card.priority] || ""}`}>{card.priority}</span>
            {(card.labels || []).map((l: string) => (
              <span key={l} className="text-xs bg-white text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">{l}</span>
            ))}
          </div>
          <p className="font-semibold text-[#1A1F2B] text-sm">{card.title}</p>
          {card.description && <p className="text-xs text-slate-500 mt-1 line-clamp-3">{card.description}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Move to board <span className="text-slate-400 font-normal">(optional — leave blank to stay in Factory)</span></label>
            <select value={targetBoardId} onChange={e => { setTargetBoardId(e.target.value); setTargetColumnId(""); }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="select-claim-board">
              <option value="">— Stay in Factory (just assign to me)</option>
              {nonFactoryBoards.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          {targetBoardId && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Move to column</label>
              {loadingCols ? <div className="h-10 bg-slate-100 rounded-lg animate-pulse" /> : (
                <select value={targetColumnId} onChange={e => setTargetColumnId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="select-claim-column">
                  <option value="">— Pick a column</option>
                  {boardColumns.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <Button onClick={doClaim} disabled={claiming || (!!targetBoardId && !targetColumnId)}
            className="bg-[#0D7377] text-white flex-1 gap-2" data-testid="button-claim-quest">
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Anchor className="w-4 h-4" />}
            Claim Quest
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>

        {/* Sword-stamp confirmation overlay (~500ms). Suppressed for reduced-motion. */}
        <AnimatePresence>
          {stamped && (
            <motion.div
              key="sword-stamp"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              data-testid="sword-stamp-overlay"
            >
              <motion.div
                initial={{ scale: 2.4, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: -12, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className="flex flex-col items-center gap-1"
              >
                <VikingCrossedSwords className="w-24 h-24 text-[#0D7377] drop-shadow-md" />
                <span className="text-xs font-display tracking-wide text-[#0D7377] bg-white/90 rounded px-2 py-0.5 border border-[#0D7377]/30">
                  Claimed{claimerName ? ` by ${claimerName}` : ""}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Admin-only modal to set a Bounty multiplier + optional expiry on a quest.
function BountyModal({ card, onClose, onSaved }: {
  card: any; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [multiplier, setMultiplier] = useState<number>(Number(card.bountyMultiplier) > 1 ? Number(card.bountyMultiplier) : 2);
  const [hasExpiry, setHasExpiry] = useState<boolean>(!!card.bountyExpiresAt);
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    if (!card.bountyExpiresAt) {
      const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    }
    return new Date(card.bountyExpiresAt).toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  async function save(clear = false) {
    let isoExpiry: string | null = null;
    if (!clear && hasExpiry) {
      const d = new Date(expiresAt + "T23:59:59");
      if (Number.isNaN(d.getTime())) {
        toast({ title: "Pick a valid expiry date", variant: "destructive" });
        return;
      }
      isoExpiry = d.toISOString();
    }
    setSaving(true);
    const body = { multiplier: clear ? 1 : multiplier, expiresAt: isoExpiry };
    const res = await apiRequest("PATCH", `/api/kanban/factory/cards/${card.id}/bounty`, body);
    setSaving(false);
    if (res.success) {
      toast({ title: clear ? "Bounty cleared" : `Bounty set ×${multiplier}` });
      onSaved();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#D4A843]" />
            <h2 className="text-lg font-display text-[#1A1F2B]">Bounty Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Multiplies the XP reward when this quest is completed. Stacks with the Initiative bonus for factory-claimed quests.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Multiplier (×{multiplier.toFixed(1)})</label>
            <input
              type="range" min={1} max={5} step={0.5}
              value={multiplier} onChange={e => setMultiplier(parseFloat(e.target.value))}
              className="w-full" data-testid="input-bounty-multiplier"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>×1</span><span>×2</span><span>×3</span><span>×4</span><span>×5</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={hasExpiry} onChange={e => setHasExpiry(e.target.checked)} data-testid="checkbox-bounty-expiry" />
            Expires on
          </label>
          {hasExpiry && (
            <input
              type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40"
              data-testid="input-bounty-expires-at"
            />
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={() => save(false)} disabled={saving} className="bg-[#D4A843] text-white flex-1 gap-2" data-testid="button-save-bounty">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
            Save Bounty
          </Button>
          {Number(card.bountyMultiplier) > 1 && (
            <Button variant="outline" onClick={() => save(true)} disabled={saving} data-testid="button-clear-bounty">Clear</Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [labels, setLabels] = useState("");
  const [adding, setAdding] = useState(false);

  async function doAdd() {
    if (!title.trim()) return;
    setAdding(true);
    const res = await apiRequest("POST", "/api/kanban/factory/cards", {
      title: title.trim(), description: desc.trim() || null,
      priority, labels: labels ? labels.split(",").map(l => l.trim()).filter(Boolean) : [],
    });
    setAdding(false);
    if (res.success) { toast({ title: "Quest added to the Factory ⚓" }); onAdded(); }
    else toast({ title: "Failed", description: res.error, variant: "destructive" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#0D7377]" />
            <h2 className="text-lg font-display text-[#1A1F2B]">Add Quest to Factory</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title <span className="text-red-400">*</span></label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && doAdd()}
              placeholder="What needs to be built?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-factory-title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="More context about this quest..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none" data-testid="input-factory-desc" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="select-factory-priority">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Labels <span className="text-slate-400 font-normal">(comma-sep)</span></label>
              <input value={labels} onChange={e => setLabels(e.target.value)} placeholder="ai, automation"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-factory-labels" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={doAdd} disabled={adding || !title.trim()} className="bg-[#0D7377] text-white flex-1 gap-2" data-testid="button-add-factory-task">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add to Factory
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function LongshipFactoryView({ factoryData, boards, onRefresh, onOpenInBoard, currentUser }: {
  factoryData: any; boards: any[]; onRefresh: () => void; onOpenInBoard: () => void;
  currentUser?: { role?: string; firstName?: string };
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterColumn, setFilterColumn] = useState("all");
  const [showCsvGuide, setShowCsvGuide] = useState(false);
  const [claimingCard, setClaimingCard] = useState<any>(null);
  const [bountyCard, setBountyCard] = useState<any>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.role === "admin";

  const columns = factoryData?.columns || [];
  const allCards = columns.flatMap((col: any) =>
    (col.cards || []).map((card: any) => ({ ...card, columnTitle: col.title, columnColor: col.color }))
  );
  const filtered = allCards.filter((card: any) => {
    if (filterPriority !== "all" && card.priority !== filterPriority) return false;
    if (filterColumn !== "all" && String(card.columnId) !== filterColumn) return false;
    if (search) {
      const q = search.toLowerCase();
      return card.title.toLowerCase().includes(q) ||
        (card.description || "").toLowerCase().includes(q) ||
        (card.labels || []).some((l: string) => l.toLowerCase().includes(q));
    }
    return true;
  });

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const form = new FormData();
    form.append("csv", file);
    try {
      const resp = await fetch("/api/kanban/factory/import", { method: "POST", credentials: "include", body: form });
      const data = await resp.json();
      if (data.success) {
        setImportResult(data.data);
        toast({ title: `Imported ${data.data.inserted} quest${data.data.inserted !== 1 ? "s" : ""} ⚓` });
        onRefresh();
      } else toast({ title: "Import failed", description: data.error, variant: "destructive" });
    } catch { toast({ title: "Import failed", description: "Network error", variant: "destructive" }); }
    setImporting(false);
    if (csvInputRef.current) csvInputRef.current.value = "";
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Ship className="w-5 h-5 text-[#0D7377]" />
            <h2 className="text-xl font-display text-[#1A1F2B]">Longship Factory</h2>
            <Badge variant="secondary" className="text-xs">{allCards.length} quests</Badge>
          </div>
          <p className="text-sm text-slate-500">Unassigned future-building tasks. Browse, add to the pile, or claim one to make it yours.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onOpenInBoard} className="gap-1.5 text-xs border-slate-200" data-testid="button-factory-board-view">
            <Kanban className="w-3.5 h-3.5" /> Board View
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCsvGuide(p => !p)}
            className={`gap-1.5 text-xs ${showCsvGuide ? "border-[#0D7377] text-[#0D7377]" : "border-slate-200"}`} data-testid="button-csv-guide">
            <Info className="w-3.5 h-3.5" /> CSV Guide
            <ChevronDown className={`w-3 h-3 transition-transform ${showCsvGuide ? "rotate-180" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => csvInputRef.current?.click()} disabled={importing}
            className="gap-1.5 text-xs border-slate-200" data-testid="button-import-csv">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />} Import CSV
          </Button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} data-testid="input-csv-file" />
          <Button variant="outline" size="sm" onClick={() => setShowGenerate(true)}
            className="gap-1.5 text-xs border-[#D4A843] text-[#8a6a14] hover:bg-amber-50" data-testid="button-generate-with-ai">
            <Sparkles className="w-3.5 h-3.5" /> Generate with AI
          </Button>
          <Button size="sm" onClick={() => setShowAddTask(true)} className="bg-[#0D7377] text-white gap-1.5 text-xs" data-testid="button-add-factory-quest">
            <Plus className="w-3.5 h-3.5" /> Add Quest
          </Button>
        </div>
      </div>

      {/* CSV Guide */}
      {showCsvGuide && (
        <div className="mb-5 rounded-xl border border-[#0D7377]/20 bg-teal-50/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#0D7377] flex items-center gap-1.5"><Info className="w-4 h-4" /> CSV Format Guide</p>
            <a href="/api/kanban/factory/sample.csv" download className="inline-flex items-center gap-1 text-xs text-[#0D7377] hover:underline" data-testid="link-download-sample-csv">
              <FileDown className="w-3.5 h-3.5" /> Download sample.csv
            </a>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {([
              ["title", "Required. The name of the quest.", true],
              ["description", "Optional. More detail about the task.", false],
              ["priority", "Optional: low · medium · high · urgent", false],
              ["labels", "Optional. Comma-separated tags (e.g. ai,mobile)", false],
              ["due_date", "Optional. Format: YYYY-MM-DD", false],
            ] as [string, string, boolean][]).map(([field, desc, req]) => (
              <div key={field} className="flex items-start gap-2">
                <span className={`font-mono font-bold shrink-0 ${req ? "text-red-600" : "text-slate-600"}`}>{field}{req ? " *" : ""}</span>
                <span className="text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-white border border-slate-200 p-2.5 font-mono text-xs text-slate-600 overflow-x-auto whitespace-nowrap">
            title,description,priority,labels,due_date<br />
            "Build AI form","Automate intake",high,"ai,automation",2026-07-01<br />
            "Write grant templates","Reusable templates",low,"grants,content",
          </div>
          {importResult && (
            <p className="mt-2 text-xs text-[#0D7377] font-medium">
              Last import: {importResult.inserted} added{importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ""}.
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quests..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            data-testid="input-factory-search" />
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
          data-testid="select-factory-priority-filter">
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterColumn} onChange={e => setFilterColumn(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
          data-testid="select-factory-column-filter">
          <option value="all">All columns</option>
          {columns.map((col: any) => <option key={col.id} value={col.id}>{col.title}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {allCards.length} quests</span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Ship className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">{allCards.length === 0 ? "The Factory is empty — add the first quest!" : "No quests match your filters."}</p>
          {allCards.length === 0 && (
            <Button onClick={() => setShowAddTask(true)} className="mt-4 bg-[#0D7377] text-white gap-2"><Plus className="w-4 h-4" /> Add First Quest</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((card: any) => {
            const baseXp = xpForPriority(card.priority);
            const bountyMult = card.bountyActive ? Number(card.bountyMultiplier || 1) : 1;
            // Show full potential reward including the Initiative bonus claimers earn.
            const totalXp = Math.round(baseXp * INITIATIVE_MULTIPLIER * bountyMult);
            const fitScore = Number(card.interestFit ?? 3);
            const fitTags: string[] = card.interestFitTags || [];
            const expiryStr = card.bountyExpiresAt
              ? new Date(card.bountyExpiresAt).toLocaleDateString()
              : null;
            return (
              <HoverCard key={card.id} openDelay={150} closeDelay={80}>
                <HoverCardTrigger asChild>
                <div
                  tabIndex={0}
                  className={`group relative flex flex-col rounded-xl p-4 shadow-sm border-l-4 ${PRIORITY_BORDER[card.priority] || "border-l-slate-200"} bg-gradient-to-br from-[#fbf6e8] via-[#fdfaf0] to-[#f5ecd3] hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D7377]/40 transition-all`}
                  style={{ backgroundImage: "linear-gradient(135deg,#fbf6e8 0%,#fdfaf0 60%,#f5ecd3 100%)" }}
                  data-testid={`factory-card-${card.id}`}
                >
                  {/* Bounty ribbon */}
                  {card.bountyActive && (
                    <div
                      className="absolute -top-2 -right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-[#D4A843] to-[#b48424] text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
                      title={expiryStr ? `Bounty expires ${expiryStr}` : "Open bounty"}
                      data-testid={`bounty-ribbon-${card.id}`}
                    >
                      <Crown className="w-3 h-3" /> Bounty ×{Number(card.bountyMultiplier).toFixed(1)}
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-2">
                    <WaxSeal priority={card.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1F2B] line-clamp-2 leading-snug">{card.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <InterestFitStars score={fitScore} />
                        {card.assignee && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">claimed</span>
                        )}
                      </div>
                    </div>
                    {/* XP reward stamp */}
                    <div
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-[#0D7377] text-white shadow-md ring-2 ring-[#D4A843]/40 shrink-0"
                      title={`Reward: ${totalXp} XP`}
                      data-testid={`xp-stamp-${card.id}`}
                    >
                      <Coins className="w-3.5 h-3.5 -mb-0.5 text-[#D4A843]" />
                      <span className="text-sm font-bold leading-none">{totalXp}</span>
                      <span className="text-[8px] uppercase tracking-wider opacity-80 mt-0.5">XP</span>
                    </div>
                  </div>

                  {card.description && (
                    <p className="text-xs text-slate-600/90 line-clamp-2 mb-3 italic">{card.description}</p>
                  )}

                  {(card.labels || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(card.labels as string[]).slice(0, 4).map(l => (
                        <span key={l} className="text-[10px] bg-white/70 text-slate-600 border border-[#D4A843]/30 px-1.5 py-0.5 rounded">{l}</span>
                      ))}
                      {card.labels.length > 4 && <span className="text-[10px] text-slate-500">+{card.labels.length - 4}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[#D4A843]/30">
                    <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                      <span className="flex items-center gap-1 truncate">
                        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: card.columnColor || "#64748b" }} />
                        <span className="truncate">{card.columnTitle}</span>
                      </span>
                      {card.dueDate && (
                        <span className={`flex items-center gap-1 ${new Date(card.dueDate) < new Date() ? "text-red-500" : ""}`}>
                          <Calendar className="w-3 h-3" />{new Date(card.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isAdmin && (
                        <button
                          onClick={() => setBountyCard(card)}
                          className={`p-1 rounded ${card.bountyActive ? "text-[#D4A843]" : "text-slate-400 hover:text-[#D4A843]"} hover:bg-white/70`}
                          aria-label="Set bounty"
                          title={card.bountyActive ? `Bounty ×${Number(card.bountyMultiplier).toFixed(1)}` : "Set bounty (admin)"}
                          data-testid={`button-bounty-${card.id}`}
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Button
                        size="sm" onClick={() => setClaimingCard(card)}
                        className="bg-[#0D7377] hover:bg-[#0a5e62] text-white text-xs gap-1 h-7 px-2"
                        data-testid={`button-claim-${card.id}`}
                      >
                        <Anchor className="w-3 h-3" /> Claim
                      </Button>
                    </div>
                  </div>
                </div>
                </HoverCardTrigger>
                <HoverCardContent side="top" align="end" className="w-72 p-3 bg-[#fdfaf0] border-[#D4A843]/40">
                  <p className="text-sm font-semibold text-[#1A1F2B] mb-1">{card.title}</p>
                  {card.description && (
                    <p className="text-xs text-slate-600 mb-2 whitespace-pre-wrap">{card.description}</p>
                  )}
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Base XP</span><span className="font-mono">{baseXp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Initiative bonus</span><span className="font-mono">×{INITIATIVE_MULTIPLIER}</span>
                    </div>
                    {card.bountyActive && (
                      <div className="flex justify-between text-[#8a6a14]">
                        <span>Bounty {expiryStr ? `(until ${expiryStr})` : ""}</span>
                        <span className="font-mono">×{Number(card.bountyMultiplier).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-[#D4A843]/30 pt-1 mt-1 font-semibold text-[#0D7377]">
                      <span>Reward if you claim &amp; finish</span><span className="font-mono">{totalXp} XP</span>
                    </div>
                  </div>
                  {(card.labels || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(card.labels as string[]).map(l => {
                        const matched = fitTags.includes(l.toLowerCase());
                        return (
                          <span key={l} className={`text-[10px] px-1.5 py-0.5 rounded border ${matched ? "bg-[#D4A843]/20 text-[#8a6a14] border-[#D4A843]/50" : "bg-white text-slate-600 border-slate-200"}`}>
                            {l}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                    Interest fit {Math.round(fitScore)}/5{fitTags.length > 0 ? ` — based on your past ratings of "${fitTags.slice(0, 3).join(", ")}"` : " — no overlap with your history yet"}.
                  </p>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      )}

      {claimingCard && (
        <ClaimModal card={claimingCard} boards={boards} onClose={() => setClaimingCard(null)}
          claimerName={currentUser?.firstName}
          onClaimed={() => { setClaimingCard(null); onRefresh(); }} />
      )}
      {bountyCard && (
        <BountyModal card={bountyCard} onClose={() => setBountyCard(null)}
          onSaved={() => { setBountyCard(null); onRefresh(); }} />
      )}
      {showAddTask && (
        <AddTaskModal onClose={() => setShowAddTask(false)} onAdded={() => { setShowAddTask(false); onRefresh(); }} />
      )}
      {showGenerate && (
        <GenerateQuestsModal onClose={() => setShowGenerate(false)} onGenerated={() => { setShowGenerate(false); onRefresh(); }} />
      )}
    </div>
  );
}

function GenerateQuestsModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: () => void }) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_COUNT = 50;
  const MAX_PROMPT = 4000;

  async function doGenerate() {
    setError(null);
    const trimmed = prompt.trim();
    if (!trimmed) { setError("Please describe what kind of quests you want."); return; }
    if (trimmed.length > MAX_PROMPT) { setError(`Prompt is too long (max ${MAX_PROMPT} characters).`); return; }
    const n = Math.min(Math.max(Math.floor(count || 0), 1), MAX_COUNT);
    setGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/kanban/factory/generate", { prompt: trimmed, count: n });
      if (res.success) {
        const inserted = res.data?.inserted ?? 0;
        toast({ title: `${inserted} quest${inserted === 1 ? "" : "s"} added to the Longship Factory ⚓` });
        onGenerated();
      } else {
        setError(res.error || "Failed to generate quests.");
      }
    } catch (e: any) {
      setError(e?.message || "Network error while generating quests.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={generating ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4A843]" />
            <h2 className="text-lg font-display text-[#1A1F2B]">Generate Quests with AI</h2>
          </div>
          <button onClick={onClose} disabled={generating} className="p-1 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-50" data-testid="button-close-generate">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Describe a concern, desire, or outcome and let AI draft a batch of quest cards directly into the Longship Factory.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              What do you want to address? <span className="text-red-400">*</span>
            </label>
            <textarea
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={6}
              maxLength={MAX_PROMPT}
              placeholder='e.g., "We need to become more trauma informed across all client intake and training materials."'
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 resize-none"
              data-testid="input-generate-prompt"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-400">Be specific about the outcome you want.</span>
              <span className="text-[10px] text-slate-400">{prompt.length}/{MAX_PROMPT}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              How many quests? <span className="text-slate-400 font-normal">(1–{MAX_COUNT})</span>
            </label>
            <input
              type="number"
              min={1}
              max={MAX_COUNT}
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40"
              data-testid="input-generate-count"
            />
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" data-testid="text-generate-error">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <Button
            onClick={doGenerate}
            disabled={generating || !prompt.trim()}
            className="bg-[#D4A843] hover:bg-[#bf962e] text-white flex-1 gap-2"
            data-testid="button-do-generate"
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate {Math.min(Math.max(Math.floor(count || 0), 1), MAX_COUNT)} quest{count === 1 ? "" : "s"}</>}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Kanban Content ───────────────────────────────────────────────────────

function KanbanContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [portalUsers, setPortalUsers] = useState<any[]>([]);
  const [view, setView] = useState<"boards" | "my-tasks" | "factory">("boards");
  const [editingBoard, setEditingBoard] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [factoryData, setFactoryData] = useState<any>(null);
  const [factoryLoading, setFactoryLoading] = useState(false);

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

  async function loadFactory() {
    setFactoryLoading(true);
    const res = await apiRequest("GET", "/api/kanban/factory");
    if (res.success) setFactoryData(res.data);
    setFactoryLoading(false);
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

  function openEditBoard(e: React.MouseEvent, board: any) {
    e.stopPropagation();
    setEditingBoard(board);
    setEditName(board.name);
    setEditDesc(board.description || "");
  }

  async function saveEditBoard() {
    if (!editName.trim() || !editingBoard) return;
    const res = await apiRequest("PATCH", `/api/kanban/boards/${editingBoard.id}`, { name: editName.trim(), description: editDesc.trim() });
    if (res.success) {
      setBoards(prev => prev.map(b => b.id === editingBoard.id ? { ...b, name: editName.trim(), description: editDesc.trim() } : b));
      setEditingBoard(null);
    }
  }

  async function deleteBoard(e: React.MouseEvent, board: any) {
    e.stopPropagation();
    if (!confirm(`Delete "${board.name}"? All columns and cards will be archived.`)) return;
    const res = await apiRequest("DELETE", `/api/kanban/boards/${board.id}`);
    if (res.success) setBoards(prev => prev.filter(b => b.id !== board.id));
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

    // Block move to a completion column (Done/Valhalla) if peer review is not approved
    const targetCol = activeBoard.columns.find((c: any) => c.id === newColumnId);
    if (targetCol && isCompletionColumn(targetCol.title)) {
      const card = activeBoard.columns.flatMap((c: any) => c.cards).find((c: any) => c.id === cardId);
      if (card && !card.review_approved) {
        toast({
          title: "Peer review required",
          description: "This task needs a 3rd party review before it can be moved to Done. Ask your assigned reviewer to approve it first.",
          variant: "destructive",
        });
        return;
      }
    }

    const newBoard = { ...activeBoard, columns: activeBoard.columns.map((col: any) => ({ ...col, cards: col.cards.filter((c: any) => c.id !== cardId) })) };
    const card = activeBoard.columns.flatMap((c: any) => c.cards).find((c: any) => c.id === cardId);
    if (card) {
      const targetCol2 = newBoard.columns.find((c: any) => c.id === newColumnId);
      if (targetCol2) targetCol2.cards.splice(newPosition, 0, { ...card, columnId: newColumnId });
    }
    setActiveBoard(newBoard);
    const r = await apiRequest("PATCH", `/api/kanban/cards/${cardId}`, { columnId: newColumnId, position: newPosition });
    if (!r.success) {
      loadBoard(activeBoard.id);
      toast({ title: "Move blocked", description: r.error, variant: "destructive" });
    }
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
                                {/* Manager-visible "Loved this" gold marker — set when a 4★+ rated card is completed */}
                                {card.lovedThis && (user?.role === "admin") && (
                                  <span
                                    className="text-[#D4A843]"
                                    title="Loved this — completed and rated 4★ or higher"
                                    data-testid={`badge-loved-${card.id}`}
                                  >
                                    <Heart className="w-3 h-3 fill-current" />
                                  </span>
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
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
            Kanban Boards
            <VikingCrossedSwords size={22} className="text-[#0D7377]/40" />
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Your battle plans, organized by the gods.</p>
        </div>
        {view === "boards" && (
          <Button onClick={() => setShowNewBoard(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-board"><Plus className="w-4 h-4" /> New Board</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 overflow-x-auto">
        <button onClick={() => setView("boards")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors whitespace-nowrap ${view === "boards" ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid="tab-boards">
          <Kanban className="w-4 h-4" /> All Boards <span className="text-xs">{boards.filter((b: any) => !b.isLongshipFactory).length}</span>
        </button>
        <button onClick={() => setView("my-tasks")} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors whitespace-nowrap ${view === "my-tasks" ? "border-[#0D7377] text-[#0D7377]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid="tab-my-tasks">
          <ClipboardList className="w-4 h-4" /> My Tasks
        </button>
        <button onClick={() => { setView("factory"); if (!factoryData) loadFactory(); }} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors whitespace-nowrap ${view === "factory" ? "border-[#D4A843] text-[#D4A843]" : "border-transparent text-slate-500 hover:text-slate-700"}`} data-testid="tab-factory">
          <Ship className="w-4 h-4" /> Longship Factory
        </button>
      </div>

      {view === "my-tasks" ? (
        <MyTasksView
          onOpenCard={(cardId, boardId) => { loadBoard(boardId).then(() => setSelectedCardId(cardId)); }}
          onOpenBoard={loadBoard}
        />
      ) : view === "factory" ? (
        factoryLoading ? (
          <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}</div>
        ) : (
          <LongshipFactoryView
            factoryData={factoryData}
            boards={boards}
            onRefresh={loadFactory}
            currentUser={user ? { role: user.role, firstName: user.firstName } : undefined}
            onOpenInBoard={() => {
              const factoryBoard = boards.find((b: any) => b.isLongshipFactory);
              if (factoryBoard) loadBoard(factoryBoard.id);
            }}
          />
        )
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
            ) : boards.filter((b: any) => !b.isLongshipFactory).map((board: any) => (
              <Card key={board.id} className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm group" onClick={() => loadBoard(board.id)} data-testid={`card-board-${board.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#1A1F2B]">{board.name}</h3>
                      {board.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{board.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => openEditBoard(e, board)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-[#0D7377]"
                        data-testid={`button-edit-board-${board.id}`}
                        title="Edit board"
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={e => deleteBoard(e, board)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                        data-testid={`button-delete-board-${board.id}`}
                        title="Delete board"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
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

      {/* Edit Board Modal */}
      {editingBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingBoard(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display text-[#1A1F2B]">Edit Board</h2>
              <button onClick={() => setEditingBoard(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Board name</label>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEditBoard()}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                  data-testid="input-edit-board-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none"
                  data-testid="input-edit-board-desc"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={saveEditBoard} className="bg-[#0D7377] text-white flex-1" data-testid="button-save-board-edit">Save changes</Button>
              <Button variant="outline" onClick={() => setEditingBoard(null)}>Cancel</Button>
            </div>
          </div>
        </div>
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
