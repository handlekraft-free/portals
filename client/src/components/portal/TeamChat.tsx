import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Hash, Megaphone, Plus, Send, Smile, Paperclip, X, ChevronRight, MessageSquare, Pencil, Trash2, Check, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "🚀"];
const POLL_MS = 4000;

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

function Avatar({ user, size = "sm" }: { user: any; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${sz} rounded-full bg-[#0D7377] text-white flex items-center justify-center font-bold shrink-0`} title={user ? `${user.firstName} ${user.lastName}` : ""}>
      {initials(user)}
    </div>
  );
}

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
      <button onClick={onPickerOpen} className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors" data-testid="button-open-emoji-picker">
        <Smile className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  return (
    <div className="absolute z-30 bottom-6 left-0 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex gap-1.5 flex-wrap w-52">
      {QUICK_EMOJIS.map(e => (
        <button key={e} onClick={() => { onPick(e); onClose(); }} className="text-lg hover:scale-125 transition-transform">
          {e}
        </button>
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
          <span className="text-xs font-semibold text-[#1A1F2B]">
            {msg.author ? `${msg.author.firstName} ${msg.author.lastName}` : "Unknown"}
          </span>
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
              <a key={att.id} href={`/api/chat/attachments/${att.id}/download`} className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg text-slate-600 transition-colors" data-testid={`attachment-${att.id}`}>
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
          {isOwn && (
            <button onClick={() => onEdit(msg)} className="p-1 text-slate-400 hover:text-slate-600 rounded" data-testid={`button-edit-${msg.id}`}><Pencil className="w-3.5 h-3.5" /></button>
          )}
          {isOwn && (
            <button onClick={() => onDelete(msg.id)} className="p-1 text-slate-400 hover:text-red-500 rounded" data-testid={`button-delete-${msg.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      )}
    </div>
  );
}

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
    setText("");
    setSending(false);
    load();
  }

  return (
    <div className="flex flex-col h-full border-l border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-white">
        <MessageSquare className="w-4 h-4 text-[#0D7377]" />
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
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Reply in thread…" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-thread-reply" />
          <button onClick={send} disabled={sending || !text.trim()} className="bg-[#0D7377] text-white px-3 py-2 rounded-lg hover:bg-[#0D7377]/90 disabled:opacity-40 transition-colors" data-testid="button-send-thread-reply">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamChat() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest("GET", "/api/chat/channels").then(r => {
      if (r.success && r.data.length > 0) {
        setChannels(r.data);
        setActiveChannel(r.data[0]);
      }
    });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    const res = await apiRequest("GET", `/api/chat/channels/${activeChannel.id}/messages`);
    if (res.success) setMessages(res.data);
  }, [activeChannel]);

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages();
    const t = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

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
    setEditingMsg(null);
    loadMessages();
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    const res = await apiRequest("POST", "/api/chat/channels", { name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-") });
    if (res.success) { setChannels(prev => [...prev, res.data]); setActiveChannel(res.data); setNewChannelName(""); setShowNewChannel(false); }
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="flex h-[520px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 shrink-0 bg-[#1A1F2B] flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">Team Chat</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">Channels</p>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch); setThreadMsg(null); }} className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${activeChannel?.id === ch.id ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`} data-testid={`channel-${ch.id}`}>
              {ch.type === "announcements" ? <Megaphone className="w-3.5 h-3.5 shrink-0 text-[#D4A843]" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
          {showNewChannel ? (
            <div className="px-2 mt-1">
              <input autoFocus value={newChannelName} onChange={e => setNewChannelName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createChannel(); if (e.key === "Escape") setShowNewChannel(false); }} placeholder="channel-name" className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none placeholder-white/30" data-testid="input-new-channel" />
            </div>
          ) : isAdmin && (
            <button onClick={() => setShowNewChannel(true)} className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors" data-testid="button-new-channel">
              <Plus className="w-3 h-3" /> Add Channel
            </button>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className={`flex-1 flex flex-col min-w-0 ${threadMsg ? "w-0" : ""}`}>
        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 shrink-0">
          {activeChannel?.type === "announcements"
            ? <Megaphone className="w-4 h-4 text-[#D4A843]" />
            : <Hash className="w-4 h-4 text-slate-400" />}
          <span className="font-semibold text-sm text-[#1A1F2B]">{activeChannel?.name || "Select a channel"}</span>
          {activeChannel?.description && <span className="text-xs text-slate-400 hidden md:block">— {activeChannel.description}</span>}
          {isAdmin && (
            <button onClick={() => setIsAnnouncement(v => !v)} className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${isAnnouncement ? "bg-amber-100 text-amber-700 border-amber-300" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`} data-testid="button-toggle-announcement">
              <Megaphone className="w-3 h-3" /> {isAnnouncement ? "Announcement ON" : "Announce"}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Be the first to say something!</p>
            </div>
          )}
          {messages.map(msg => (
            editingMsg?.id === msg.id ? (
              <div key={msg.id} className="flex gap-2">
                <Avatar user={msg.author} />
                <div className="flex-1 flex gap-2">
                  <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingMsg(null); }} className="flex-1 text-sm border border-[#0D7377] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-edit-message" />
                  <button onClick={saveEdit} className="text-[#0D7377]" data-testid="button-save-edit"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingMsg(null)} className="text-slate-400"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <MessageRow key={msg.id} msg={msg} currentUserId={user?.id || 0} onReact={reactToMessage} onDelete={deleteMessage} onEdit={m => { setEditingMsg(m); setEditText(m.content); }} onOpenThread={setThreadMsg} />
            )
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
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
            <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#0D7377]/30">
              <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message #${activeChannel?.name || "..."}`} rows={1} className="flex-1 text-sm resize-none focus:outline-none bg-transparent max-h-24" data-testid="input-chat-message" />
              <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
              <button onClick={() => fileRef.current?.click()} className="text-slate-400 hover:text-slate-600 shrink-0" data-testid="button-attach-file">
                <Upload className="w-4 h-4" />
              </button>
            </div>
            <button onClick={send} disabled={sending || (!text.trim() && files.length === 0)} className="bg-[#0D7377] text-white p-2.5 rounded-xl hover:bg-[#0D7377]/90 disabled:opacity-40 transition-colors shrink-0" data-testid="button-send-message">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Thread panel */}
      {threadMsg && (
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
    </div>
  );
}
