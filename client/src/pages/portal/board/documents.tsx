import { useEffect, useRef, useState, useCallback } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  FileText, Upload, Download, Check, Plus, Lock, Eye, Clock, History,
  Search, X, Users, AlertCircle, Trash2, Edit3, FileCheck,
  FolderOpen, Shield, RefreshCw, Activity, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "All Documents",       value: "_all",              icon: <FolderOpen className="w-4 h-4" />, restricted: false },
  { label: "Bylaws & Policies",   value: "Bylaws & Policies", icon: <FileText className="w-4 h-4" />,   restricted: false },
  { label: "Financials",          value: "Financials",        icon: <FileText className="w-4 h-4" />,   restricted: false },
  { label: "Meeting Materials",   value: "Meeting Materials", icon: <FileText className="w-4 h-4" />,   restricted: false },
  { label: "Strategic Plan",      value: "Strategic Plan",    icon: <FileText className="w-4 h-4" />,   restricted: false },
  { label: "Written Consents",    value: "Written Consents",  icon: <FileCheck className="w-4 h-4" />,  restricted: false },
  { label: "Past Resolutions Archive", value: "Past Resolutions Archive", icon: <FileText className="w-4 h-4" />, restricted: false },
  { label: "Legal",               value: "Legal",             icon: <Shield className="w-4 h-4" />,     restricted: true  },
  { label: "Personnel",           value: "Personnel",         icon: <Users className="w-4 h-4" />,      restricted: true  },
];

const UPLOAD_CATEGORIES = CATEGORIES.filter(c => c.value !== "_all");

const CONF_COLORS: Record<string, string> = {
  public:     "bg-green-100 text-green-700 border-green-200",
  board_only: "bg-indigo-100 text-indigo-700 border-indigo-200",
  restricted: "bg-red-100 text-red-700 border-red-200",
};

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Modals ────────────────────────────────────────────────────────────────────

function VersionHistoryModal({
  doc,
  onClose,
  isAdmin,
  onNewVersion,
}: {
  doc: any;
  onClose: () => void;
  isAdmin: boolean;
  onNewVersion: () => void;
}) {
  const [versions, setVersions] = useState<any[]>(doc.versions || []);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function uploadVersion() {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("versionNotes", notes);
    const r = await fetch(`/api/board/documents/${doc.id}/versions`, {
      method: "POST", body: fd, credentials: "include",
    });
    const data = await r.json();
    if (data.success) {
      toast({ title: "New version uploaded" });
      setFile(null); setNotes("");
      const refreshed = await apiRequest("GET", `/api/board/documents/${doc.id}`);
      if (refreshed.success) setVersions(refreshed.data.versions || []);
      onNewVersion();
    } else {
      toast({ title: "Upload failed", description: data.error, variant: "destructive" });
    }
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="font-semibold text-[#1A1F2B]">Version History</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-close-versions"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No file attached yet.</p>
          ) : (
            versions.map((v: any) => (
              <div key={v.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`version-row-${v.id}`}>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 text-xs font-bold">v{v.versionNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1F2B] truncate">{v.filename || v.title}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(v.uploadedAt || v.uploaded_at)} · {formatBytes(v.fileSize || v.file_size)}
                    {(v.uploaderFirst || v.uploader_first) && (
                      <span> · by {v.uploaderFirst || v.uploader_first} {v.uploaderLast || v.uploader_last}</span>
                    )}
                  </p>
                  {v.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{v.notes}</p>}
                </div>
                <a
                  href={`/api/board/documents/${doc.id}/download/${v.id}`}
                  className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Download this version"
                  data-testid={`button-dl-version-${v.id}`}
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))
          )}
        </div>

        {isAdmin && (
          <div className="p-5 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Upload New Version</p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileRef.current?.click()}
              data-testid="dropzone-version-upload"
            >
              <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
              <p className="text-xs text-slate-400">{file ? file.name : "Click to select file"}</p>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} data-testid="input-version-file" />
            </div>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Version notes (optional)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-version-notes"
            />
            <Button
              className="w-full bg-indigo-500 text-white text-sm"
              disabled={!file || uploading}
              onClick={uploadVersion}
              data-testid="button-upload-version"
            >
              {uploading ? "Uploading…" : "Upload New Version"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AckTrackingModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [data, setData] = useState<{ acked: any[]; notAcked: any[] } | null>(null);

  useEffect(() => {
    apiRequest("GET", `/api/board/documents/${doc.id}/acks`).then(r => {
      if (r.success) setData(r.data);
    });
  }, [doc.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="font-semibold text-[#1A1F2B]">Acknowledgment Tracking</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-close-acks"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!data ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : (
            <>
              {data.acked.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Acknowledged ({data.acked.length})</p>
                  <div className="space-y-1.5">
                    {data.acked.map((a: any) => (
                      <div key={a.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50" data-testid={`acked-row-${a.user_id}`}>
                        <div>
                          <p className="text-sm font-medium text-[#1A1F2B]">{a.first_name} {a.last_name}</p>
                          {a.board_position && <p className="text-xs text-slate-400">{a.board_position}</p>}
                        </div>
                        <p className="text-xs text-green-600">{fmtDate(a.acked_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.notAcked.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Pending ({data.notAcked.length})</p>
                  <div className="space-y-1.5">
                    {data.notAcked.map((u: any) => (
                      <div key={u.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50" data-testid={`notacked-row-${u.user_id}`}>
                        <div>
                          <p className="text-sm font-medium text-[#1A1F2B]">{u.first_name} {u.last_name}</p>
                          {u.board_position && <p className="text-xs text-slate-400">{u.board_position}</p>}
                        </div>
                        <p className="text-xs text-amber-500">Pending</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.acked.length === 0 && data.notAcked.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No board members found.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AuditTrailModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const [events, setEvents] = useState<any[] | null>(null);

  useEffect(() => {
    apiRequest("GET", `/api/board/documents/${doc.id}/audit`).then(r => {
      if (r.success) setEvents(r.data);
    });
  }, [doc.id]);

  const ACTION_ICON: Record<string, string> = {
    upload: "⬆", new_version: "🔄", view: "👁", download: "⬇",
    acknowledge: "✓", update: "✏", delete: "🗑",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="font-semibold text-[#1A1F2B]">Document Activity</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{doc.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-close-audit"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!events ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-50" data-testid={`audit-row-${e.id}`}>
                  <span className="text-sm mt-0.5">{ACTION_ICON[e.action] || "•"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1A1F2B]">
                      <span className="font-medium">{e.first_name} {e.last_name}</span>
                      {" "}<span className="text-slate-500 capitalize">{e.action.replace("_", " ")}</span>
                    </p>
                    {e.detail && <p className="text-xs text-slate-400 truncate">{e.detail}</p>}
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{fmtDateTime(e.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditDocModal({ doc, onClose, onSaved }: { doc: any; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const canSeeRestricted = user?.role === "admin" || !!user?.boardRestrictedAccess;
  const uploadCategories = UPLOAD_CATEGORIES.filter(c => !c.restricted || canSeeRestricted);
  const [form, setForm] = useState({
    title: doc.title,
    description: doc.description || "",
    category: doc.category,
    confidentiality: doc.confidentiality,
    requireAck: doc.requireAck ?? doc.require_ack,
    retentionPolicy: doc.retentionPolicy ?? doc.retention_policy ?? "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function save() {
    setSaving(true);
    const r = await apiRequest("PATCH", `/api/board/documents/${doc.id}`, form);
    if (r.success) {
      toast({ title: "Document updated" });
      onSaved();
      onClose();
    } else {
      toast({ title: "Update failed", description: r.error, variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <p className="font-semibold text-[#1A1F2B]">Edit Document</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-edit-title" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" data-testid="textarea-edit-desc" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-edit-category">
              {uploadCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={form.confidentiality} onChange={e => setForm(f => ({ ...f, confidentiality: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-edit-confidentiality">
              <option value="board_only">Board Only</option>
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
          <input value={form.retentionPolicy} onChange={e => setForm(f => ({ ...f, retentionPolicy: e.target.value }))} placeholder="Retention policy (optional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-edit-retention" />
          <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-edit-requireack">
            <input type="checkbox" checked={!!form.requireAck} onChange={e => setForm(f => ({ ...f, requireAck: e.target.checked }))} className="accent-indigo-500" />
            <span className="text-sm text-slate-600">Require acknowledgment from all board members</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white" onClick={save} disabled={saving} data-testid="button-save-edit">{saving ? "Saving…" : "Save Changes"}</Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const { user } = useAuth();
  const canSeeRestricted = user?.role === "admin" || !!user?.boardRestrictedAccess;
  const uploadCategories = UPLOAD_CATEGORIES.filter(c => !c.restricted || canSeeRestricted);
  const [form, setForm] = useState({
    title: "", description: "", category: "Bylaws & Policies",
    confidentiality: "board_only", requireAck: false,
    retentionPolicy: "", versionNotes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function submit() {
    if (!form.title || !form.category) {
      toast({ title: "Title and category are required", variant: "destructive" }); return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("category", form.category);
    fd.append("confidentiality", form.confidentiality);
    fd.append("requireAck", String(form.requireAck));
    fd.append("retentionPolicy", form.retentionPolicy);
    fd.append("versionNotes", form.versionNotes);
    if (file) fd.append("file", file);
    const r = await fetch("/api/board/documents", { method: "POST", body: fd, credentials: "include" });
    const data = await r.json();
    if (data.success) {
      const msg = data.isNewVersion ? "New version added to existing document" : "Document uploaded successfully";
      toast({ title: msg });
      onUploaded();
      onClose();
    } else {
      toast({ title: "Upload failed", description: data.error, variant: "destructive" });
    }
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <p className="font-semibold text-[#1A1F2B]">Upload Board Document</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-close-upload"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700">
            <strong>Tip:</strong> Uploading a document with the same title and category as an existing document will add a new version to it.
          </div>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Document title *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            data-testid="input-doc-title"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            data-testid="textarea-doc-desc"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-doc-category">
                {uploadCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Access Level</label>
              <select value={form.confidentiality} onChange={e => setForm(f => ({ ...f, confidentiality: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-doc-confidentiality">
                <option value="board_only">Board Only</option>
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>
          <input
            value={form.retentionPolicy}
            onChange={e => setForm(f => ({ ...f, retentionPolicy: e.target.value }))}
            placeholder="Retention policy (e.g. 7 years — optional)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            data-testid="input-doc-retention"
          />
          <label className="flex items-center gap-2 cursor-pointer" data-testid="checkbox-require-ack">
            <input type="checkbox" checked={form.requireAck} onChange={e => setForm(f => ({ ...f, requireAck: e.target.checked }))} className="accent-indigo-500" />
            <span className="text-sm text-slate-600">Require acknowledgment from all board members</span>
          </label>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Attach File</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition-colors"
              onClick={() => fileRef.current?.click()}
              data-testid="dropzone-doc-upload"
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
              <p className="text-sm text-slate-400">{file ? file.name : "Click to attach file"}</p>
              {file && <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)}</p>}
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} data-testid="input-doc-file" />
            </div>
          </div>
          {file && (
            <input
              value={form.versionNotes}
              onChange={e => setForm(f => ({ ...f, versionNotes: e.target.value }))}
              placeholder="Version notes for this file (optional)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              data-testid="input-version-notes"
            />
          )}
          <div className="flex gap-2 pt-1">
            <Button className="bg-indigo-500 text-white flex-1" onClick={submit} disabled={uploading || !form.title} data-testid="button-save-doc">
              {uploading ? "Uploading…" : "Upload Document"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocCard({
  doc,
  isAdmin,
  onAck,
  onShowVersions,
  onShowAcks,
  onShowAudit,
  onEdit,
  onDelete,
}: {
  doc: any;
  isAdmin: boolean;
  onAck: () => void;
  onShowVersions: () => void;
  onShowAcks: () => void;
  onShowAudit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasFile = parseInt(doc.version_count || "0") > 0;
  const currentVer = doc.current_version;
  const ackCount = parseInt(doc.ack_count || "0");
  const userAcked = doc.user_acked === true || doc.user_acked === "true";
  const requireAck = doc.require_ack === true || doc.require_ack === "true";

  return (
    <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow" data-testid={`doc-card-${doc.id}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-sm text-[#1A1F2B]">{doc.title}</p>
              {currentVer && (
                <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600 px-1.5">
                  v{currentVer}
                </Badge>
              )}
              <Badge className={`${CONF_COLORS[doc.confidentiality] || ""} text-xs border px-1.5 py-0`}>
                {doc.confidentiality === "board_only" ? "Board Only" : doc.confidentiality === "restricted" ? "Restricted" : "Public"}
              </Badge>
              {requireAck && !userAcked && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border px-1.5 py-0 flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> Ack needed
                </Badge>
              )}
              {userAcked && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs border px-1.5 py-0 flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Acknowledged
                </Badge>
              )}
            </div>

            {doc.description && (
              <p className="text-xs text-slate-400 mb-1 line-clamp-2">{doc.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(doc.created_at)}</span>
              {(doc.uploader_first || doc.uploader_last) && (
                <span>by {doc.uploader_first} {doc.uploader_last}</span>
              )}
              {hasFile && (
                <span className="flex items-center gap-1">
                  <History className="w-3 h-3" />{doc.version_count} version{parseInt(doc.version_count) !== 1 ? "s" : ""}
                </span>
              )}
              {ackCount > 0 && <span className="flex items-center gap-1"><Check className="w-3 h-3" />{ackCount} ack{ackCount !== 1 ? "s" : ""}</span>}
              {parseInt(doc.view_count || "0") > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{doc.view_count}</span>}
              {doc.retention_policy && <span className="text-slate-300">· {doc.retention_policy}</span>}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {requireAck && !userAcked && (
              <button onClick={onAck} title="Acknowledge this document" className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors" data-testid={`button-ack-doc-${doc.id}`}>
                <Check className="w-4 h-4" />
              </button>
            )}
            {hasFile && (
              <a href={`/api/board/documents/${doc.id}/download`} title="Download latest version" className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" data-testid={`button-download-doc-${doc.id}`}>
                <Download className="w-4 h-4" />
              </a>
            )}
            <button onClick={onShowVersions} title="Version history" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" data-testid={`button-versions-${doc.id}`}>
              <History className="w-4 h-4" />
            </button>
            {isAdmin && requireAck && (
              <button onClick={onShowAcks} title="View acknowledgments" className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" data-testid={`button-ack-tracking-${doc.id}`}>
                <Users className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button onClick={onShowAudit} title="Document activity log" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" data-testid={`button-audit-${doc.id}`}>
                <Activity className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button onClick={onEdit} title="Edit metadata" className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" data-testid={`button-edit-doc-${doc.id}`}>
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button onClick={onDelete} title="Delete document" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" data-testid={`button-delete-doc-${doc.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function DocumentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canSeeRestricted = isAdmin || !!user?.boardRestrictedAccess;
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("_all");
  const [allDocs, setAllDocs] = useState<any[]>([]);   // all docs for current category (for client-side filter)
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");           // live filter text
  const [searchAllResults, setSearchAllResults] = useState<any[] | null>(null); // cross-cat search
  const [searchingAll, setSearchingAll] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [versionsDoc, setVersionsDoc] = useState<any | null>(null);
  const [acksDoc, setAcksDoc] = useState<any | null>(null);
  const [auditDoc, setAuditDoc] = useState<any | null>(null);
  const [editDoc, setEditDoc] = useState<any | null>(null);
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});

  const loadDocs = useCallback(() => {
    setLoading(true);
    const url = activeCategory === "_all"
      ? "/api/board/documents"
      : `/api/board/documents?category=${encodeURIComponent(activeCategory)}`;
    apiRequest("GET", url).then(r => {
      if (r.success) {
        setAllDocs(r.data);
        if (activeCategory === "_all") {
          const counts: Record<string, number> = {};
          for (const d of r.data) counts[d.category] = (counts[d.category] || 0) + 1;
          setCatCounts(counts);
        }
      }
      setLoading(false);
    });
  }, [activeCategory]);

  useEffect(() => {
    document.title = "Board Documents | handləkraft";
    loadDocs();
    setSearchQ("");
    setSearchAllResults(null);
  }, [loadDocs]);

  // Client-side filter on current category
  const filteredDocs = searchQ.trim()
    ? allDocs.filter(d =>
        d.title.toLowerCase().includes(searchQ.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(searchQ.toLowerCase())
      )
    : allDocs;

  // Cross-category backend search
  const triggerSearchAll = useCallback(async () => {
    if (!searchQ.trim()) return;
    setSearchingAll(true);
    const r = await apiRequest("GET", `/api/board/documents/search?q=${encodeURIComponent(searchQ)}`);
    if (r.success) setSearchAllResults(r.data);
    setSearchingAll(false);
  }, [searchQ]);

  const displayDocs = searchAllResults !== null ? searchAllResults : filteredDocs;

  async function acknowledge(docId: number) {
    const r = await apiRequest("POST", `/api/board/documents/${docId}/ack`);
    if (r.success) { toast({ title: "Document acknowledged" }); loadDocs(); }
  }

  async function deleteDoc(doc: any) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const r = await apiRequest("DELETE", `/api/board/documents/${doc.id}`);
    if (r.success) { toast({ title: "Document deleted" }); loadDocs(); }
    else toast({ title: "Delete failed", description: r.error, variant: "destructive" });
  }

  async function openVersions(doc: any) {
    const r = await apiRequest("GET", `/api/board/documents/${doc.id}`);
    if (r.success) setVersionsDoc(r.data);
  }

  const pendingAcks = allDocs.filter(d => {
    const requireAck = d.require_ack === true || d.require_ack === "true";
    const userAcked = d.user_acked === true || d.user_acked === "true";
    return requireAck && !userAcked;
  }).length;

  return (
    <div className="flex gap-6 min-h-0">
      {/* ── Category Sidebar ── */}
      <aside className="w-52 shrink-0 hidden md:block">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Categories</p>
          </div>
          <nav className="p-2 space-y-0.5">
            {CATEGORIES.filter(cat => !cat.restricted || canSeeRestricted).map(cat => {
              const count = cat.value === "_all"
                ? allDocs.length
                : catCounts[cat.value] || 0;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setActiveCategory(cat.value);
                    setSearchQ("");
                    setSearchAllResults(null);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                    activeCategory === cat.value
                      ? "bg-indigo-500 text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                  data-testid={`cat-${cat.value.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </span>
                  {count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium shrink-0 ${activeCategory === cat.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {pendingAcks > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Action needed</p>
            <p className="text-xs text-amber-600 mt-0.5">{pendingAcks} document{pendingAcks !== 1 ? "s" : ""} require your acknowledgment.</p>
          </div>
        )}
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-display text-[#1A1F2B]">
              {searchAllResults !== null ? "Search Results" : activeCategory === "_all" ? "Board Documents" : activeCategory}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {searchAllResults !== null
                ? `${searchAllResults.length} result${searchAllResults.length !== 1 ? "s" : ""} across all categories for "${searchQ}"`
                : searchQ.trim()
                  ? `${filteredDocs.length} of ${allDocs.length} documents match`
                  : `${allDocs.length} document${allDocs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDocs} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors" title="Refresh" data-testid="button-refresh-docs">
              <RefreshCw className="w-4 h-4" />
            </button>
            {isAdmin && (
              <Button onClick={() => setShowUpload(true)} className="bg-indigo-500 text-white gap-2" data-testid="button-upload-doc">
                <Plus className="w-4 h-4" /> Upload
              </Button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchAllResults(null); }}
              placeholder={activeCategory === "_all" ? "Filter documents…" : `Filter in ${activeCategory}…`}
              className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              data-testid="input-doc-search"
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(""); setSearchAllResults(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" data-testid="button-clear-search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQ.trim() && activeCategory !== "_all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerSearchAll}
              disabled={searchingAll}
              className="shrink-0 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              data-testid="button-search-all"
            >
              {searchingAll ? "Searching…" : <><ChevronRight className="w-3 h-3 mr-1" />Search all</>}
            </Button>
          )}
          {searchAllResults !== null && (
            <Button variant="ghost" size="sm" onClick={() => setSearchAllResults(null)} className="shrink-0 text-xs text-slate-500" data-testid="button-back-to-category">
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : displayDocs.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base">
              {searchQ.trim()
                ? "No documents match your search."
                : "No documents in this category."}
            </p>
            {isAdmin && !searchQ.trim() && searchAllResults === null && (
              <Button onClick={() => setShowUpload(true)} className="mt-4 bg-indigo-500 text-white" data-testid="button-upload-first">
                Upload First Document
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayDocs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                isAdmin={isAdmin}
                onAck={() => acknowledge(doc.id)}
                onShowVersions={() => openVersions(doc)}
                onShowAcks={() => setAcksDoc(doc)}
                onShowAudit={() => setAuditDoc(doc)}
                onEdit={() => setEditDoc(doc)}
                onDelete={() => deleteDoc(doc)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={loadDocs} />}

      {versionsDoc && (
        <VersionHistoryModal
          doc={versionsDoc}
          isAdmin={isAdmin}
          onClose={() => setVersionsDoc(null)}
          onNewVersion={loadDocs}
        />
      )}

      {acksDoc && isAdmin && <AckTrackingModal doc={acksDoc} onClose={() => setAcksDoc(null)} />}
      {auditDoc && isAdmin && <AuditTrailModal doc={auditDoc} onClose={() => setAuditDoc(null)} />}
      {editDoc && isAdmin && <EditDocModal doc={editDoc} onClose={() => setEditDoc(null)} onSaved={loadDocs} />}
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
