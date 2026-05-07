import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2, Bot, User, Sparkles, AlertCircle, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

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

// Parse stored content: "[[ATTACHMENTS:file1.png,doc.txt]]\nmessage"
function parseContent(raw: string): { names: string[]; text: string } {
  const match = raw.match(/^\[\[ATTACHMENTS:([^\]]*)\]\]\n?([\s\S]*)$/);
  if (match) {
    const names = match[1].split(",").map(n => n.trim()).filter(Boolean);
    return { names, text: match[2] };
  }
  return { names: [], text: raw };
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
function isImageName(name: string) {
  return IMAGE_EXTS.has(name.split(".").pop()?.toLowerCase() ?? "");
}

// ── Attachment Chips (in message bubbles, from parsed history) ────────────────

function AttachmentChips({ names, isUser }: { names: string[]; isUser: boolean }) {
  if (names.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {names.map((name, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
            isUser ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {isImageName(name)
            ? <ImageIcon className="w-3 h-3 shrink-0" />
            : <FileText className="w-3 h-3 shrink-0" />}
          <span className="max-w-[120px] truncate">{name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, streaming }: { msg: any; streaming?: boolean }) {
  const isUser = msg.role === "user";
  const { names, text } = parseContent(msg.content || "");
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`ai-message-${msg.id || "streaming"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-[#2563EB]" : "bg-[#0F172A]"}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? "bg-[#2563EB] text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
          <AttachmentChips names={names} isUser={isUser} />
          {text}
          {streaming && <span className="inline-block w-1 h-4 bg-slate-600 animate-pulse ml-0.5 align-text-bottom" />}
        </div>
        {msg.createdAt && !streaming && (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1">{relTime(msg.createdAt)}</span>
        )}
      </div>
    </div>
  );
}

// ── Pending file chip (shown in input area before sending) ────────────────────

interface PendingFile {
  file: File;
  previewUrl: string | null;
}

function PendingFileChip({ pf, onRemove }: { pf: PendingFile; onRemove: () => void }) {
  const isImage = pf.file.type.startsWith("image/");
  return (
    <div className="relative flex-shrink-0 group">
      {isImage && pf.previewUrl ? (
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200">
          <img src={pf.previewUrl} alt={pf.file.name} className="w-full h-full object-cover" />
          <button
            onClick={onRemove}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid="button-remove-file"
          >
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[140px]">
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-xs text-slate-600 truncate">{pf.file.name}</span>
          <button
            onClick={onRemove}
            className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
            data-testid="button-remove-file"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Accepted file types ───────────────────────────────────────────────────────

const ACCEPT = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "text/plain", "text/csv", "text/markdown",
  "application/json", "application/javascript",
  "text/javascript", "text/html", "text/css", "text/xml",
  ".ts", ".tsx", ".js", ".jsx", ".md", ".py", ".rb", ".go", ".rs", ".java",
].join(",");

type ChatVariant = "employee" | "board" | "general";

const VARIANT_CONFIG: Record<ChatVariant, {
  label: string;
  subtitle: string;
  greeting: string;
  subgreeting: string;
  prompts: string[];
}> = {
  board: {
    label: "Board Advisory AI",
    subtitle: "Briefed on your documents & forum discussions",
    greeting: "Hello, Board Member.",
    subgreeting: "I've reviewed your governance documents and forum discussions. Ask me anything about strategy, policy, financials, or how a prior decision might apply here.",
    prompts: [
      "Summarize our key governance documents",
      "What are our most active forum discussions?",
      "Are there any governance risks I should know about?",
      "Help me draft a motion or resolution",
    ],
  },
  employee: {
    label: "Strategy & Ops AI",
    subtitle: "Aware of your backlog & Longship Factory tasks",
    greeting: "Ready to help you work smarter.",
    subgreeting: "I can see all active board cards and the Longship Factory queue. Ask me about redundant tasks, synergies, what to pick up next, or anything else.",
    prompts: [
      "Are there any redundant tasks across boards?",
      "Which factory tasks align with active work?",
      "Who looks most overloaded right now?",
      "Help me write a task description",
    ],
  },
  general: {
    label: "Claude AI",
    subtitle: "Powered by Anthropic · Supports images & files",
    greeting: "Hi! I'm your AI assistant.",
    subgreeting: "Ask me anything — or drop a file to analyze it.",
    prompts: [
      "Help me write a project proposal",
      "Review this email draft…",
      "How should I approach this problem?",
      "Summarize the key points of…",
    ],
  },
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ClaudeChat({ variant = "general" }: { variant?: ChatVariant }) {
  const config = VARIANT_CONFIG[variant];
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest("GET", "/api/ai/history").then(r => {
      if (r.success) setMessages(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingText]);

  function addFiles(files: File[]) {
    const valid: PendingFile[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} is too large (max 10 MB)`, variant: "destructive" });
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      valid.push({ file, previewUrl });
    }
    setPendingFiles(prev => {
      if (prev.length + valid.length > 5) {
        toast({ title: "Max 5 files per message", variant: "destructive" });
        return prev;
      }
      return [...prev, ...valid];
    });
  }

  function removeFile(idx: number) {
    setPendingFiles(prev => {
      const pf = prev[idx];
      if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  }

  async function send() {
    const msg = input.trim();
    if ((!msg && pendingFiles.length === 0) || streaming) return;
    setInput("");
    setError(null);
    setStreamingText("");

    const filesToSend = [...pendingFiles];
    setPendingFiles([]);
    filesToSend.forEach(pf => { if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl); });

    // Build optimistic user message content
    const attachNames = filesToSend.map(pf => pf.file.name);
    const optimisticContent = attachNames.length > 0
      ? `[[ATTACHMENTS:${attachNames.join(",")}]]\n${msg}`.trim()
      : msg;

    const optimisticUser = { id: `opt-${Date.now()}`, role: "user", content: optimisticContent, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticUser]);
    setStreaming(true);

    try {
      // Use FormData when files are present, plain JSON otherwise
      let body: BodyInit;
      let headers: Record<string, string> = {};

      if (filesToSend.length > 0) {
        const fd = new FormData();
        fd.append("message", msg);
        filesToSend.forEach(pf => fd.append("files", pf.file));
        body = fd;
        // Don't set Content-Type — browser sets it with boundary automatically
      } else {
        body = JSON.stringify({ message: msg });
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers,
        credentials: "include",
        body,
      });

      if (!res.ok) throw new Error("Request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let realUserMsg: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "user_message") {
              realUserMsg = event.data;
            } else if (event.type === "delta") {
              accumulated += event.text;
              setStreamingText(accumulated);
            } else if (event.type === "done") {
              setMessages(prev => {
                const withoutOpt = prev.filter(m => m.id !== optimisticUser.id);
                return [...withoutOpt, realUserMsg || optimisticUser, event.data];
              });
              setStreamingText("");
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id));
      setStreamingText("");
      setError(err.message || "Failed to get response. The AI service may require activation.");
    } finally {
      setStreaming(false);
    }
  }

  async function clearHistory() {
    if (!confirm("Clear conversation history?")) return;
    await apiRequest("DELETE", "/api/ai/history");
    setMessages([]);
    setStreamingText("");
  }

  const isEmpty = messages.length === 0 && !streaming;
  const canSend = (input.trim().length > 0 || pendingFiles.length > 0) && !streaming;

  return (
    <div
      className={`flex flex-col h-[520px] bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${dragOver ? "border-[#2563EB] border-2" : "border-slate-200"}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 shrink-0 bg-gradient-to-r from-[#0F172A] to-[#2563EB]">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{config.label}</p>
          <p className="text-[10px] text-white/60">{config.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="ml-auto flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors" data-testid="button-clear-ai-history">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#2563EB] flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">{config.greeting}</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs leading-snug">{config.subgreeting}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
              {config.prompts.map((p, i) => (
                <button key={i} onClick={() => { setInput(p); textareaRef.current?.focus(); }} className="text-xs text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 transition-colors leading-snug" data-testid={`suggested-prompt-${i}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
            {streaming && streamingText && (
              <MessageBubble msg={{ role: "assistant", content: streamingText }} streaming />
            )}
            {streaming && !streamingText && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0F172A] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700" data-testid="ai-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Couldn't get a response</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Drag overlay hint */}
      {dragOver && (
        <div className="absolute inset-0 bg-[#2563EB]/10 flex items-center justify-center pointer-events-none rounded-2xl z-10">
          <div className="bg-white border-2 border-dashed border-[#2563EB] rounded-xl px-6 py-4 text-sm font-medium text-[#2563EB]">
            Drop files to attach
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((pf, i) => (
              <PendingFileChip key={i} pf={pf} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={streaming || pendingFiles.length >= 5}
            className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-[#2563EB] hover:border-[#2563EB]/40 transition-colors disabled:opacity-40 shrink-0"
            title="Attach image or file"
            data-testid="button-attach-file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={handleFileInput}
            data-testid="input-file-upload"
          />

          {/* Text input */}
          <div className="flex-1 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#2563EB]/30">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={pendingFiles.length > 0 ? "Add a message about your file(s)…" : "Ask Claude anything…"}
              rows={1}
              disabled={streaming}
              className="w-full text-sm resize-none focus:outline-none bg-transparent max-h-24 disabled:opacity-50"
              data-testid="input-claude-message"
            />
          </div>

          {/* Send button */}
          <button
            onClick={send}
            disabled={!canSend}
            className="bg-gradient-to-br from-[#0F172A] to-[#2563EB] text-white p-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
            data-testid="button-send-claude"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mt-1.5 text-center">
          Images, text files, CSV, JSON, code — up to 5 files · 10 MB each · Drag &amp; drop supported
        </p>
      </div>
    </div>
  );
}
