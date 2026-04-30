import { useEffect, useRef, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { FileText, Upload, Download, Check, X, Plus, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CONFIDENTIALITY_COLORS: Record<string, string> = {
  public: "bg-green-100 text-green-700 border-green-200",
  board_only: "bg-indigo-100 text-indigo-700 border-indigo-200",
  restricted: "bg-red-100 text-red-700 border-red-200",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  policy: "bg-blue-100 text-blue-700",
  report: "bg-teal-100 text-teal-700",
  financial: "bg-amber-100 text-amber-700",
  legal: "bg-purple-100 text-purple-700",
  strategic: "bg-indigo-100 text-indigo-700",
  other: "bg-slate-100 text-slate-700",
};

function DocumentsContent() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "report", confidentiality: "board_only" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = () => {
    setLoading(true);
    apiRequest("GET", "/api/board/documents").then(r => {
      if (r.success) setDocs(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { document.title = "Board Documents | handləkraft.ai"; loadDocs(); }, []);

  async function uploadDocument() {
    if (!form.title) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("category", form.category);
    fd.append("confidentiality", form.confidentiality);
    if (selectedFile) fd.append("file", selectedFile);
    await fetch("/api/board/documents", { method: "POST", body: fd, credentials: "include" });
    setShowCreate(false); setForm({ title: "", description: "", category: "report", confidentiality: "board_only" }); setSelectedFile(null);
    loadDocs(); setUploading(false);
  }

  async function acknowledge(docId: number) {
    await apiRequest("POST", `/api/board/documents/${docId}/acknowledge`);
    loadDocs();
  }

  const types = ["all", ...Array.from(new Set(docs.map(d => d.category)))];
  const filtered = filter === "all" ? docs : docs.filter(d => d.category === filter);

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Board Documents</h1>
          <p className="text-slate-500 text-sm mt-0.5">Policies, reports, legal documents, and strategic materials.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-upload-doc"><Plus className="w-4 h-4" /> Upload</Button>
      </div>

      {showCreate && (
        <Card className="mb-5 border-indigo-200 shadow-sm">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-[#1A1F2B]">Upload Document</p>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-doc-title" />
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" data-testid="textarea-doc-desc" />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-doc-category">
                <option value="policy">Policy</option>
                <option value="report">Report</option>
                <option value="financial">Financial</option>
                <option value="legal">Legal</option>
                <option value="strategic">Strategic</option>
                <option value="other">Other</option>
              </select>
              <select value={form.confidentiality} onChange={e => setForm(f => ({ ...f, confidentiality: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-doc-confidentiality">
                <option value="board_only">Board Only</option>
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
              <p className="text-xs text-slate-400">{selectedFile ? selectedFile.name : "Click to attach file (optional)"}</p>
              <input ref={fileInputRef} type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} data-testid="input-doc-file" />
            </div>
            <div className="flex gap-2">
              <Button className="bg-indigo-500 text-white" onClick={uploadDocument} disabled={uploading} data-testid="button-save-doc">{uploading ? "Uploading…" : "Upload"}</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter pills */}
      {types.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${filter === t ? "bg-indigo-500 text-white border-indigo-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`filter-${t}`}>{t === "all" ? "All" : t}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><FileText className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No documents yet.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id} className="border-0 shadow-sm" data-testid={`doc-card-${doc.id}`}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-[#1A1F2B] truncate">{doc.title}</p>
                      <Badge className={`${DOC_TYPE_COLORS[doc.category] || ""} text-xs capitalize`}>{doc.category}</Badge>
                      <Badge className={`${CONFIDENTIALITY_COLORS[doc.confidentiality] || ""} text-xs flex items-center gap-0.5`}>
                        <Lock className="w-2.5 h-2.5" />{doc.confidentiality.replace("_", " ")}
                      </Badge>
                    </div>
                    {doc.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{doc.description}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={`/api/board/documents/${doc.id}/download`} download className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Download" data-testid={`button-download-doc-${doc.id}`}><Download className="w-4 h-4" /></a>
                    <button onClick={() => acknowledge(doc.id)} className="p-1.5 rounded-lg hover:bg-green-50 text-slate-500 hover:text-green-600 transition-colors" title="Acknowledge" data-testid={`button-ack-doc-${doc.id}`}><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BoardDocuments() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><DocumentsContent /></BoardLayout>
    </PortalGuard>
  );
}
