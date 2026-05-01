import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { MessageSquare, Plus, Send, ChevronLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ForumsContent() {
  const [topics, setTopics] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTopic, setActiveTopic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newTopic, setNewTopic] = useState(false);
  const [topicForm, setTopicForm] = useState({ title: "", content: "" });
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    document.title = "Board Forums | handləkraft.ai";
    loadTopics();
  }, []);

  async function loadTopics() {
    setLoading(true);
    const r = await apiRequest("GET", "/api/board/forums/topics");
    if (r.success) setTopics(r.data || []);
    setLoading(false);
  }

  async function openTopic(t: any) {
    setActiveTopic(t);
    setPostsLoading(true);
    const r = await apiRequest("GET", `/api/board/forums/topics/${t.id}/posts`);
    if (r.success) setPosts(r.data || []);
    setPostsLoading(false);
  }

  async function createTopic() {
    if (!topicForm.title.trim() || !topicForm.content.trim()) return;
    setPosting(true);
    const r = await apiRequest("POST", "/api/board/forums/topics", topicForm);
    if (r.success) {
      setNewTopic(false);
      setTopicForm({ title: "", content: "" });
      loadTopics();
    }
    setPosting(false);
  }

  async function postReply() {
    if (!replyText.trim() || !activeTopic) return;
    setPosting(true);
    const r = await apiRequest("POST", `/api/board/forums/topics/${activeTopic.id}/posts`, { content: replyText });
    if (r.success) {
      setReplyText("");
      const r2 = await apiRequest("GET", `/api/board/forums/topics/${activeTopic.id}/posts`);
      if (r2.success) setPosts(r2.data || []);
    }
    setPosting(false);
  }

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  const LegalDisclaimer = () => (
    <div className="mb-5 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5" role="alert">
      <span className="text-amber-600 text-lg shrink-0 leading-none">⚠</span>
      <p className="text-xs text-amber-800">
        <strong>Legal notice:</strong> This forum is for discussion purposes only. It is <strong>not</strong> a mechanism for official board votes, decisions, or actions. Under California law, board decisions require either a duly noticed meeting or a unanimous written consent procedure. Any action item discussed here must be formalized through the appropriate channel.
      </p>
    </div>
  );

  if (activeTopic) {
    return (
      <div>
        <LegalDisclaimer />
        <button onClick={() => setActiveTopic(null)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mb-5" data-testid="button-back-topics">
          <ChevronLeft className="w-4 h-4" /> All topics
        </button>
        <h1 className="text-xl font-display text-[#1A1F2B] mb-1" data-testid="text-topic-title">{activeTopic.title}</h1>
        <p className="text-xs text-slate-400 mb-6">Posted by {activeTopic.first_name} {activeTopic.last_name} · {new Date(activeTopic.created_at || activeTopic.createdAt).toLocaleDateString()}</p>

        <Card className="border-0 shadow-sm mb-3">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{activeTopic.content}</p>
          </CardContent>
        </Card>

        {postsLoading ? (
          <div className="space-y-2 my-4">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-2 my-4">
            {posts.map(p => (
              <Card key={p.id} className="border-0 shadow-sm" data-testid={`post-${p.id}`}>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs font-semibold text-indigo-600 mb-1">{p.first_name} {p.last_name} · {new Date(p.created_at || p.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            data-testid="textarea-reply"
          />
          <Button onClick={postReply} disabled={posting || !replyText.trim()} className="bg-indigo-500 text-white self-end gap-1.5" data-testid="button-post-reply">
            <Send className="w-4 h-4" /> Reply
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-500" /> Board Forums
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Private discussion forums for board members.</p>
        </div>
        <Button onClick={() => setNewTopic(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-new-topic">
          <Plus className="w-4 h-4" /> New Topic
        </Button>
      </div>

      {newTopic && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">Start a New Discussion</p>
            <input
              value={topicForm.title}
              onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Topic title…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-topic-title"
            />
            <textarea
              value={topicForm.content}
              onChange={e => setTopicForm(f => ({ ...f, content: e.target.value }))}
              placeholder="What would you like to discuss?"
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              data-testid="textarea-topic-content"
            />
            <div className="flex gap-2">
              <Button onClick={createTopic} disabled={posting} className="bg-indigo-500 text-white" data-testid="button-submit-topic">
                Post Topic
              </Button>
              <Button variant="outline" onClick={() => setNewTopic(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {topics.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">No topics yet</p>
          <p className="text-slate-300 text-sm mt-1">Start a discussion using the button above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map(t => (
            <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openTopic(t)} data-testid={`topic-${t.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <MessageCircle className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-[#1A1F2B]">{t.title}</p>
                      {t.pinned && <Badge className="bg-amber-100 text-amber-700 text-xs">Pinned</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.first_name} {t.last_name} · {new Date(t.last_activity_at || t.lastActivityAt || t.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{t.content}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">{t.post_count ?? 0} replies</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardForums() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ForumsContent /></BoardLayout>
    </PortalGuard>
  );
}
