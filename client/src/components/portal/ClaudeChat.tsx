import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Trash2, Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MessageBubble({ msg, streaming }: { msg: any; streaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`ai-message-${msg.id || "streaming"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? "bg-[#0D7377]" : "bg-[#1A1F2B]"}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${isUser ? "bg-[#0D7377] text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
          {msg.content}
          {streaming && <span className="inline-block w-1 h-4 bg-slate-600 animate-pulse ml-0.5 align-text-bottom" />}
        </div>
        {msg.createdAt && !streaming && (
          <span className="text-[10px] text-slate-400 mt-0.5 px-1">{relTime(msg.createdAt)}</span>
        )}
      </div>
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "Help me write a project proposal",
  "Review this email draft…",
  "How should I approach this problem?",
  "Summarize the key points of…",
];

export default function ClaudeChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    apiRequest("GET", "/api/ai/history").then(r => {
      if (r.success) setMessages(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingText]);

  async function send() {
    const msg = input.trim();
    if (!msg || streaming) return;
    setInput("");
    setError(null);
    setStreamingText("");

    const optimisticUser = { id: `opt-${Date.now()}`, role: "user", content: msg, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticUser]);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

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

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200 shrink-0 bg-gradient-to-r from-[#1A1F2B] to-[#0D7377]">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Claude AI</p>
          <p className="text-[10px] text-white/60">Powered by Anthropic · Your personal AI assistant</p>
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A1F2B] to-[#0D7377] flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Hi! I'm your AI assistant.</p>
              <p className="text-sm text-slate-400 mt-1">Ask me anything — drafts, ideas, questions, reviews.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
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
                <div className="w-7 h-7 rounded-full bg-[#1A1F2B] flex items-center justify-center shrink-0">
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

      {/* Input */}
      <div className="p-3 border-t border-slate-200 shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-[#0D7377]/30">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Claude anything…"
              rows={1}
              disabled={streaming}
              className="w-full text-sm resize-none focus:outline-none bg-transparent max-h-24 disabled:opacity-50"
              data-testid="input-claude-message"
            />
          </div>
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="bg-gradient-to-br from-[#1A1F2B] to-[#0D7377] text-white p-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shrink-0"
            data-testid="button-send-claude"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 text-center">Claude may make mistakes. Verify important info.</p>
      </div>
    </div>
  );
}
