import { useCallback, useEffect, useRef, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  DollarSign, FileText, Upload, Download, Plus, X, Trash2,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@shared/branding";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

const PERIODS = [
  "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026",
  "Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025",
  "Annual 2025", "Annual 2024", "Annual 2023",
  "Budget 2026", "Budget 2025",
  "Audit 2025", "Audit 2024",
];

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [form, setForm] = useState({ title: "", period: "", asOfDate: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function submit() {
    if (!form.title || !form.period || !form.asOfDate || !file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("period", form.period);
    fd.append("asOfDate", form.asOfDate);
    fd.append("notes", form.notes);
    fd.append("file", file);
    const r = await fetch("/api/board/financials", { method: "POST", body: fd, credentials: "include" });
    const data = await r.json();
    if (data.success) {
      toast({ title: "Financial report uploaded" });
      onUploaded();
      onClose();
    } else {
      toast({ title: "Upload failed", description: data.error, variant: "destructive" });
    }
    setUploading(false);
  }

  const ready = form.title && form.period && form.asOfDate && file;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <p className="font-semibold text-[#0F172A]">Upload Financial Report</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400" data-testid="button-close-upload-financial"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Report Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Q1 2026 Financial Statements"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-financial-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Period *</label>
              <select
                value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="select-financial-period"
              >
                <option value="">Select…</option>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">As of Date *</label>
              <input
                type="date"
                value={form.asOfDate}
                onChange={e => setForm(f => ({ ...f, asOfDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                data-testid="input-financial-date"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes or context for board members…"
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              data-testid="textarea-financial-notes"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">File * (PDF or Excel, max 50 MB)</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileRef.current?.click()}
              data-testid="dropzone-financial"
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
              <p className="text-sm text-slate-400">{file ? file.name : "Click to select file"}</p>
              {file && <p className="text-xs text-slate-300 mt-0.5">{formatBytes(file.size)}</p>}
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] || null)} data-testid="input-financial-file" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white" onClick={submit} disabled={uploading || !ready} data-testid="button-save-financial">
              {uploading ? "Uploading…" : "Upload Report"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MIME_BADGE(mime: string | null) {
  if (!mime) return { label: "FILE", class: "bg-slate-100 text-slate-600" };
  if (mime.includes("pdf")) return { label: "PDF", class: "bg-red-100 text-red-700" };
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("xlsx") || mime.includes("xls")) return { label: "Excel", class: "bg-green-100 text-green-700" };
  if (mime.includes("csv")) return { label: "CSV", class: "bg-blue-100 text-blue-700" };
  return { label: "FILE", class: "bg-slate-100 text-slate-600" };
}

function FinancialsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(() => {
    apiRequest("GET", "/api/board/financials").then(r => {
      if (r.success) setRecords(r.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { document.title = `Financials | ${BRAND.fullName}`; load(); }, [load]);

  async function deleteRecord(record: any) {
    if (!confirm(`Delete "${record.title}"? This cannot be undone.`)) return;
    const r = await apiRequest("DELETE", `/api/board/financials/${record.id}`);
    if (r.success) { toast({ title: "Report deleted" }); load(); }
    else toast({ title: "Delete failed", description: r.error, variant: "destructive" });
  }

  if (loading) return (
    <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}</div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-500" /> Financials
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Financial reports, budgets, and audit documents for board review.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" data-testid="button-refresh-financials">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button onClick={() => setShowUpload(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-add-financial">
            <Plus className="w-4 h-4" /> Upload Report
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <DollarSign className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No financial reports yet</p>
          <p className="text-xs mt-1 mb-6">Reports uploaded by the treasurer will appear here.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-xl mx-auto">
            {[
              { label: "Form 990", desc: "Annual tax return for nonprofits", icon: "📄" },
              { label: "Budget",   desc: "Approved annual operating budget",  icon: "📊" },
              { label: "Audit",    desc: "Independent financial audit",        icon: "🔍" },
            ].map(item => (
              <Card key={item.label} className="border border-dashed border-slate-200 shadow-none bg-slate-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-sm font-semibold text-slate-600 mt-2">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => {
            const badge = MIME_BADGE(r.mime_type);
            return (
              <Card key={r.id} className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow" data-testid={`financial-${r.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm text-[#0F172A]">{r.title}</p>
                        <Badge className={`text-xs border-0 ${badge.class}`}>{badge.label}</Badge>
                        <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">{r.period}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                        <span>As of {fmtDate(r.as_of_date)}</span>
                        {(r.first_name || r.last_name) && <span>by {r.first_name} {r.last_name}</span>}
                        <span>Uploaded {fmtDate(r.uploaded_at)}</span>
                        {r.file_size && <span>{formatBytes(r.file_size)}</span>}
                      </div>
                      {r.notes && <p className="text-xs text-slate-500 mt-1 italic">{r.notes}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <a
                        href={`/api/board/financials/${r.id}/download`}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Download"
                        data-testid={`button-download-financial-${r.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => deleteRecord(r)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                          data-testid={`button-delete-financial-${r.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={load} />}
    </div>
  );
}

export default function BoardFinancials() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><FinancialsContent /></BoardLayout>
    </PortalGuard>
  );
}
