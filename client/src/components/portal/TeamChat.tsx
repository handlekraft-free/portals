import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  Hash, Megaphone, Plus, Send, Smile, Paperclip, X, ChevronRight,
  MessageSquare, Pencil, Trash2, Check, Loader2, Upload, MessageCircle, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "🚀"];
const POLL_MS = 4000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(u: any) {
  return `${u?.firstName?.[0] || ""}${u?.lastName?.[0] || ""}`.toUpperCase() || "?";
}

function Avatar({ user, size = "sm", color = "bg-[#2563EB]" }: { user: any; size?: "sm" | "md"; color?: string }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${sz} ${color} rounded-full text-white flex items-center justify-center font-bold shrink-0`} title={user ? `${user.firstName} ${user.lastName}` : ""}>
      {initials(user)}
    </div>
  );
}

// ── Channel message sub-components ────────────────────────────────────────────

function ReactionBar({ reactions, currentUserId, onReact, onPickerOpen }: { reactions: any[]; currentUserId: number; onReact: (emoji: string) => void; onPickerOpen: () => void }) {
  const grouped: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
    grouped[r.emoji].count++;
    if (r.userId === currentUserId) grouped[r.emoji].mine = true;
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1 items-center">
      {Object.entries(grouped).map(([emoji, { count, mine }]) => (
        <button key={emoji} onClick={() => onReact(emoji)} className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${mine ? "bg-teal-100 border-teal-300 text-teal-700" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}>
          {emoji} {count}
        </button>
      ))}
      <button onClick={onPickerOpen} className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors">
        <Smile className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div className="absolute z-30 bottom-6 left-0 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex gap-1.5 flex-wrap w-52">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onPick(e); onClose(); }} className="text-lg hover:scale-125 transition-transform">{e}</button>
      ))}
    </div>
  );
}

function MessageRow({ msg, currentUserId, onReact, onDelete, onEdit, onOpenThread, depth = 0 }: {
  msg: any; currentUserId: number; onReact: (id: number, emoji: string) => void;
  onDelete: (id: number) => void; onEdit: (msg: any) => void;
  onOpenThread: (msg: any) => void; depth?: number;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isOwn = msg.userId === currentUserId;

  return (
    <div className="flex gap-2 group relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => { setHovered(false); setShowEmoji(false); }} data-testid={`message-${msg.id}`}>
      <Avatar user={msg.author} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#0F172A]">{msg.author ? `${msg.author.firstName} ${msg.author.lastName}` : "Unknown"}</span>
          {msg.isAnnouncement && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Megaphone className="w-2.5 h-2.5" /> Announcement
            </span>
          )}
          <span className="text-[10px] text-slate-400">{relTime(msg.createdAt)}{msg.editedAt ? " (edited)" : ""}</span>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        {msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {msg.attachments.map((att: any) => (
              <a key={att.id} href={`/api/chat/attachments/${att.id}/download`} className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg text-slate-600 transition-colors">
                <Paperclip className="w-3 h-3" /> {att.fileName}
              </a>
            ))}
          </div>
        )}
        <div className="relative">
          <ReactionBar reactions={msg.reactions || []} currentUserId={currentUserId} onReact={e => onReact(msg.id, e)} onPickerOpen={() => setShowEmoji(v => !v)} />
          {showEmoji && <EmojiPicker onPick={e => onReact(msg.id, e)} onClose={() => setShowEmoji(false)} />}
        </div>
        {depth === 0 && (
          <button onClick={() => onOpenThread(msg)} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 mt-0.5 transition-colors" data-testid={`button-thread-${msg.id}`}>
            <MessageSquare className="w-3 h-3" />
            {msg.replyCount > 0 ? `${msg.replyCount} repl${msg.replyCount === 1 ? "y" : "ies"}` : "Reply in thread"}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {hovered && (
        <div className="absolute right-0 top-0 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5">
          {isOwn && <button onClick={() => onEdit(msg)} className="p-1 text-slate-400 hover:text-slate-600 rounded" data-testid={`button-edit-${msg.id}`}><Pencil className="w-3.5 h-3.5" /></button>}
          {isOwn && <button onClick={() => onDelete(msg.id)} className="p-1 text-slate-400 hover:text-red-500 rounded" data-testid={`button-delete-${msg.id}`}><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      )}
    </div>
  );
}

// ── Thread panel ──────────────────────────────────────────────────────────────

function ThreadPanel({ parentMsg, currentUserId, onClose, onReact, onDelete, onEdit }: {
  parentMsg: any; currentUserId: number; onClose: () => void;
  onReact: (id: number, emoji: string) => void; onDelete: (id: number) => void; onEdit: (msg: any) => void;
}) {
  const [replies, setReplies] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await apiRequest("GET", `/api/chat/messages/${parentMsg.id}/thread`);
    if (res.success) setReplies(res.data);
  }, [parentMsg.id]);

  useEffect(() => { load(); const t = setInterval(load, POLL_MS); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies.length]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    await apiRequest("POST", `/api/chat/channels/${parentMsg.channelId}/messages`, { content: text, parentId: parentMsg.id });
    setText(""); setSending(false); load();
  }

  return (
    <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-white">
        <MessageSquare className="w-4 h-4 text-[#2563EB]" />
        <span className="text-sm font-semibold text-slate-700">Thread</span>
        <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-slate-100" data-testid="button-close-thread"><X className="w-4 h-4 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="pb-2 border-b border-slate-200">
          <MessageRow msg={parentMsg} currentUserId={currentUserId} onReact={onReact} onDelete={onDelete} onEdit={onEdit} onOpenThread={() => {}} depth={1} />
        </div>
        {replies.map(r => (
          <MessageRow key={r.id} msg={r} currentUserId={currentUserId} onReact={onReact} onDelete={onDelete} onEdit={onEdit} onOpenThread={() => {}} depth={1} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Reply in thread…" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" data-testid="input-thread-reply" />
          <button onClick={send} disabled={sending || !text.trim()} className="bg-[#2563EB] text-white px-3 py-2 rounded-lg hover:bg-[#2563EB]/90 disabled:opacity-40 transition-colors" data-testid="button-send-thread-reply">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DM message row ────────────────────────────────────────────────────────────

function DmMessageRow({ msg, currentUserId, onDelete, onEdit }: {
  msg: any; currentUserId: number; onDelete: (id: number) => void; onEdit: (msg: any) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isOwn = msg.senderId === currentUserId;

  return (
    <div className="flex gap-2 group relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} data-testid={`dm-message-${msg.id}`}>
      <Avatar user={msg.sender} color={isOwn ? "bg-[#2563EB]" : "bg-[#0F172A]"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-[#0F172A]">{msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : "Unknown"}</span>
          <span className="text-[10px] text-slate-400">{relTime(msg.createdAt)}{msg.editedAt ? " (edited)" : ""}</span>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
      </div>
      {hovered && isOwn && (
        <div className="absolute right-0 top-0 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5">
          <button onClick={() => onEdit(msg)} className="p-1 text-slate-400 hover:text-slate-600 rounded"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(msg.id)} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

// ── DM Picker modal ───────────────────────────────────────────────────────────

function DmPicker({ users, onSelect, onClose }: { users: any[]; onSelect: (userId: number) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-40 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-72 max-h-96 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0F172A]">New Direct Message</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search teammates…" className="flex-1 text-sm focus:outline-none" data-testid="input-dm-search" />
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map(u => (
            <button key={u.id} onClick={() => onSelect(u.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left" data-testid={`dm-user-${u.id}`}>
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center font-bold shrink-0">
                {initials(u)}
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F172A]">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-slate-400 capitalize">{u.role}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No teammates found</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TeamChat() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Channel state
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [editText, setEditText] = useState("");
  const [threadMsg, setThreadMsg] = useState<any>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);

  // ── DM state
  const [view, setView] = useState<"channel" | "dm">("channel");
  const [dmConvs, setDmConvs] = useState<any[]>([]);
  const [activeDmConv, setActiveDmConv] = useState<any>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmText, setDmText] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [dmUsers, setDmUsers] = useState<any[]>([]);
  const [showDmPicker, setShowDmPicker] = useState(false);
  const [editingDmMsg, setEditingDmMsg] = useState<any>(null);
  const [editDmText, setEditDmText] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const dmBottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load channels on mount
  useEffect(() => {
    apiRequest("GET", "/api/chat/channels").then(r => {
      if (r.success && r.data.length > 0) { setChannels(r.data); setActiveChannel(r.data[0]); }
    });
    loadDmConvs();
    apiRequest("GET", "/api/chat/dm/users").then(r => { if (r.success) setDmUsers(r.data); });
  }, []);

  // ── Load & poll channel messages
  const loadMessages = useCallback(async () => {
    if (!activeChannel || view !== "channel") return;
    const res = await apiRequest("GET", `/api/chat/channels/${activeChannel.id}/messages`);
    if (res.success) setMessages(res.data);
  }, [activeChannel, view]);

  useEffect(() => {
    if (view !== "channel" || !activeChannel) return;
    loadMessages();
    const t = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(t);
  }, [loadMessages, view, activeChannel]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // ── Load & poll DM messages
  const loadDmConvs = useCallback(async () => {
    const res = await apiRequest("GET", "/api/chat/dm/conversations");
    if (res.success) setDmConvs(res.data);
  }, []);

  const loadDmMessages = useCallback(async () => {
    if (!activeDmConv || view !== "dm") return;
    const res = await apiRequest("GET", `/api/chat/dm/conversations/${activeDmConv.id}/messages`);
    if (res.success) setDmMessages(res.data);
  }, [activeDmConv, view]);

  useEffect(() => {
    if (view !== "dm" || !activeDmConv) return;
    loadDmMessages();
    // Mark as read
    apiRequest("POST", `/api/chat/dm/conversations/${activeDmConv.id}/read`).then(() => loadDmConvs());
    const t = setInterval(() => {
      loadDmMessages();
      apiRequest("POST", `/api/chat/dm/conversations/${activeDmConv.id}/read`).then(() => loadDmConvs());
    }, POLL_MS);
    return () => clearInterval(t);
  }, [loadDmMessages, view, activeDmConv]);

  useEffect(() => { dmBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages.length]);

  // ── Poll DM conv list for unread badges even when in channel view
  useEffect(() => {
    const t = setInterval(loadDmConvs, POLL_MS * 2);
    return () => clearInterval(t);
  }, [loadDmConvs]);

  // ── Channel actions
  async function send() {
    if (!text.trim() && files.length === 0) return;
    if (!activeChannel) return;
    setSending(true);
    const fd = new FormData();
    fd.append("content", text.trim());
    fd.append("isAnnouncement", String(isAnnouncement));
    for (const f of files) fd.append("files", f);
    try {
      const res = await fetch(`/api/chat/channels/${activeChannel.id}/messages`, { method: "POST", body: fd, credentials: "include" });
      if (res.ok) { setText(""); setFiles([]); setIsAnnouncement(false); loadMessages(); }
      else toast({ title: "Failed to send", variant: "destructive" });
    } finally { setSending(false); }
  }

  async function reactToMessage(msgId: number, emoji: string) {
    await apiRequest("POST", `/api/chat/messages/${msgId}/reactions`, { emoji });
    loadMessages();
  }

  async function deleteMessage(msgId: number) {
    if (!confirm("Delete this message?")) return;
    await apiRequest("DELETE", `/api/chat/messages/${msgId}`);
    loadMessages();
    if (threadMsg?.id === msgId) setThreadMsg(null);
  }

  async function saveEdit() {
    if (!editingMsg || !editText.trim()) return;
    await apiRequest("PATCH", `/api/chat/messages/${editingMsg.id}`, { content: editText });
    setEditingMsg(null); loadMessages();
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const res = await apiRequest("POST", "/api/chat/channels", { name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-") });
    if (res.success) { setChannels(prev => [...prev, res.data]); setActiveChannel(res.data); setNewChannelName(""); setShowNewChannel(false); }
  }

  // ── DM actions
  async function openDmConv(conv: any) {
    setActiveDmConv(conv);
    setView("dm");
    setThreadMsg(null);
    setDmText("");
    setEditingDmMsg(null);
  }

  async function startDm(userId: number) {
    setShowDmPicker(false);
    const res = await apiRequest("POST", "/api/chat/dm/conversations", { userId });
    if (!res.success) { toast({ title: "Failed to open DM", variant: "destructive" }); return; }
    const conv = res.data;
    await loadDmConvs();
    // Find the enriched conv (with otherUser)
    const freshRes = await apiRequest("GET", "/api/chat/dm/conversations");
    if (freshRes.success) {
      setDmConvs(freshRes.data);
      const found = freshRes.data.find((c: any) => c.id === conv.id);
      if (found) { setActiveDmConv(found); setView("dm"); }
    }
  }

  async function sendDm() {
    if (!dmText.trim() || !activeDmConv) return;
    setDmSending(true);
    const res = await apiRequest("POST", `/api/chat/dm/conversations/${activeDmConv.id}/messages`, { content: dmText.trim() });
    if (res.success) { setDmText(""); loadDmMessages(); loadDmConvs(); }
    else toast({ title: "Failed to send", variant: "destructive" });
    setDmSending(false);
  }

  async function deleteDmMsg(msgId: number) {
    if (!confirm("Delete this message?")) return;
    await apiRequest("DELETE", `/api/chat/dm/messages/${msgId}`);
    loadDmMessages();
  }

  async function saveDmEdit() {
    if (!editingDmMsg || !editDmText.trim()) return;
    await apiRequest("PATCH", `/api/chat/dm/messages/${editingDmMsg.id}`, { content: editDmText });
    setEditingDmMsg(null); loadDmMessages();
  }

  const isAdmin = user?.role === "admin";
  const totalUnread = dmConvs.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="relative flex h-[520px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <div className="w-44 shrink-0 bg-[#0F172A] flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">Team Chat</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-0">
          {/* Channels */}
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">Channels</p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch); setView("channel"); setThreadMsg(null); }}
              className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${view === "channel" && activeChannel?.id === ch.id ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
              data-testid={`channel-${ch.id}`}>
              {ch.type === "announcements" ? <Megaphone className="w-3.5 h-3.5 shrink-0 text-[#10B981]" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
          {showNewChannel ? (
            <div className="px-2 mt-1">
              <input autoFocus value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowNewChannel(false); }}
                placeholder="channel-name" className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none placeholder-white/30" data-testid="input-new-channel" />
            </div>
          ) : isAdmin && (
            <button onClick={() => setShowNewChannel(true)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors" data-testid="button-new-channel">
              <Plus className="w-3 h-3" /> Add Channel
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 my-2 mx-3" />

          {/* Direct Messages */}
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1">
              DMs {totalUnread > 0 && <span className="bg-[#10B981] text-[#0F172A] text-[9px] font-bold px-1 rounded-full">{totalUnread}</span>}
            </p>
            <button onClick={() => setShowDmPicker(true)} className="text-white/40 hover:text-white/80 transition-colors" data-testid="button-new-dm" title="New direct message">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {dmConvs.length === 0 && (
            <p className="text-white/30 text-[11px] px-3 pb-1">No DMs yet</p>
          )}
          {dmConvs.map(conv => {
            const other = conv.otherUser;
            const isActive = view === "dm" && activeDmConv?.id === conv.id;
            return (
              <button key={conv.id} onClick={() => openDmConv(conv)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                data-testid={`dm-conv-${conv.id}`}>
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/70 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                  {initials(other)}
                </div>
                <span className="truncate flex-1 text-left text-sm">
                  {other ? `${other.firstName} ${other.lastName[0]}.` : "?"}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="bg-[#10B981] text-[#0F172A] text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
          {dmConvs.length === 0 && (
            <button onClick={() => setShowDmPicker(true)} className="mx-3 mt-1 text-[11px] text-white/30 hover:text-white/60 transition-colors text-left" data-testid="button-start-first-dm">
              + Start a DM
            </button>
          )}
        </div>
      </div>

      {/* ── Channel View ──────────────────────────────────────────────────── */}
      {view === "channel" && (
        <div className={`flex-1 flex flex-col min-w-0 ${threadMsg ? "" : ""}`}>
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 shrink-0">
            {activeChannel?.type === "announcements" ? <Megaphone className="w-4 h-4 text-[#10B981]" /> : <Hash className="w-4 h-4 text-slate-400" />}
            <span className="font-semibold text-sm text-[#0F172A]">{activeChannel?.name || "Select a channel"}</span>
            {activeChannel?.description && <span className="text-xs text-slate-400 hidden md:block">— {activeChannel.description}</span>}
            {isAdmin && (
              <button onClick={() => setIsAnnouncement(v => !v)} className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${isAnnouncement ? "bg-amber-100 text-amber-700 border-amber-300" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`} data-testid="button-toggle-announcement">
                <Megaphone className="w-3 h-3" /> {isAnnouncement ? "Announcement ON" : "Announce"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Be the first!</p>
              </div>
            )}
            {messages.map(msg => (
              editingMsg?.id === msg.id ? (
                <div key={msg.id} className="flex gap-2">
                  <Avatar user={msg.author} />
                  <div className="flex-1 flex gap-2">
                    <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingMsg(null); }} className="flex-1 text-sm border border-[#2563EB] rounded-lg px-3 py-1.5 focus:outline-none" data-testid="input-edit-message" />
                    <button onClick={saveEdit} className="text-[#2563EB]"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingMsg(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <MessageRow key={msg.id} msg={msg} currentUserId={user?.id || 0} onReact={reactToMessage} onDelete={deleteMessage} onEdit={m => { setEditingMsg(m); setEditText(m.content); }} onOpenThread={setThreadMsg} />
              )
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-slate-200 shrink-0">
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-slate-100 text-xs text-slate-600 px-2 py-1 rounded-full">
                    <Paperclip className="w-3 h-3" /> {f.name}
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3 ml-1 text-slate-400" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#2563EB]/30">
                <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message #${activeChannel?.name || "..."}`} rows={1} className="flex-1 text-sm resize-none focus:outline-none bg-transparent max-h-24" data-testid="input-chat-message" />
                <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                <button onClick={() => fileRef.current?.click()} className="text-slate-400 hover:text-slate-600 shrink-0" data-testid="button-attach-file"><Upload className="w-4 h-4" /></button>
              </div>
              <button onClick={send} disabled={sending || (!text.trim() && files.length === 0)} className="bg-[#2563EB] text-white p-2.5 rounded-xl hover:bg-[#2563EB]/90 disabled:opacity-40 transition-colors shrink-0" data-testid="button-send-message">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DM View ───────────────────────────────────────────────────────── */}
      {view === "dm" && (
        <div className="flex-1 flex flex-col min-w-0">
          {/* DM Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 shrink-0">
            {activeDmConv?.otherUser && (
              <div className="w-7 h-7 rounded-full bg-[#0F172A] text-white text-xs flex items-center justify-center font-bold">
                {initials(activeDmConv.otherUser)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm text-[#0F172A]">
                {activeDmConv?.otherUser ? `${activeDmConv.otherUser.firstName} ${activeDmConv.otherUser.lastName}` : "Direct Message"}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{activeDmConv?.otherUser?.role}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Direct Message</span>
            </div>
          </div>

          {/* DM Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {dmMessages.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Say hello!</p>
              </div>
            )}
            {dmMessages.map(msg => (
              editingDmMsg?.id === msg.id ? (
                <div key={msg.id} className="flex gap-2">
                  <Avatar user={msg.sender} color={msg.senderId === user?.id ? "bg-[#2563EB]" : "bg-[#0F172A]"} />
                  <div className="flex-1 flex gap-2">
                    <input autoFocus value={editDmText} onChange={e => setEditDmText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveDmEdit(); if (e.key === "Escape") setEditingDmMsg(null); }} className="flex-1 text-sm border border-[#2563EB] rounded-lg px-3 py-1.5 focus:outline-none" data-testid="input-edit-dm-message" />
                    <button onClick={saveDmEdit} className="text-[#2563EB]"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingDmMsg(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <DmMessageRow key={msg.id} msg={msg} currentUserId={user?.id || 0}
                  onDelete={deleteDmMsg}
                  onEdit={m => { setEditingDmMsg(m); setEditDmText(m.content); }}
                />
              )
            ))}
            <div ref={dmBottomRef} />
          </div>

          {/* DM Composer */}
          <div className="p-3 border-t border-slate-200 shrink-0">
            <div className="flex gap-2 items-end">
              <div className="flex-1 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#2563EB]/30">
                <textarea
                  value={dmText}
                  onChange={e => setDmText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDm(); } }}
                  placeholder={`Message ${activeDmConv?.otherUser?.firstName || "…"}`}
                  rows={1}
                  className="w-full text-sm resize-none focus:outline-none bg-transparent max-h-24"
                  data-testid="input-dm-message"
                />
              </div>
              <button onClick={sendDm} disabled={dmSending || !dmText.trim()} className="bg-[#2563EB] text-white p-2.5 rounded-xl hover:bg-[#2563EB]/90 disabled:opacity-40 transition-colors shrink-0" data-testid="button-send-dm">
                {dmSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Thread panel (channel only) ───────────────────────────────────── */}
      {view === "channel" && threadMsg && (
        <div className="w-72 shrink-0">
          <ThreadPanel
            parentMsg={threadMsg}
            currentUserId={user?.id || 0}
            onClose={() => setThreadMsg(null)}
            onReact={reactToMessage}
            onDelete={deleteMessage}
            onEdit={m => { setEditingMsg(m); setEditText(m.content); setThreadMsg(null); }}
          />
        </div>
      )}

      {/* ── DM Picker modal ───────────────────────────────────────────────── */}
      {showDmPicker && (
        <DmPicker users={dmUsers} onSelect={startDm} onClose={() => setShowDmPicker(false)} />
      )}
    </div>
  );
}
