import { useEffect, useState, useRef } from "react";
import { ClientLayout } from "@/components/portal/ClientLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { FolderOpen, Upload, Download, Trash2, File, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND } from "@shared/branding";

function formatSize(bytes: number) { if (!bytes) return "—"; const kb = bytes / 1024; if (kb < 1024) return `${Math.round(kb)} KB`; return `${Math.round(kb / 1024 * 10) / 10} MB`; }
function getIcon(mime: string) { if (mime?.startsWith("image/")) return <Image className="w-5 h-5 text-purple-500" />; if (mime?.includes("pdf") || mime?.includes("text")) return <FileText className="w-5 h-5 text-red-500" />; return <File className="w-5 h-5 text-slate-400" />; }

function FilesContent() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = `Files | ${BRAND.fullName}`; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/client/files");
    if (res.success) setFiles(res.data);
    setLoading(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/client/files", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    if (data.success) setFiles(prev => [data.data, ...prev]);
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) uploadFile(f);
  }

  async function deleteFile(id: number) {
    if (!confirm("Delete this file?")) return;
    await apiRequest("DELETE", `/api/client/files/${id}`);
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  const displayed = tab === "mine" ? files.filter(f => f.uploadedByRole !== "employee") : files;

  return (
    <div>
      <h1 className="text-2xl font-display text-[#0F172A] mb-1">Files</h1>
      <p className="text-slate-500 text-sm mb-5">Shared files between you and the {BRAND.name} team.</p>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 mb-5 text-center cursor-pointer transition-colors ${dragOver ? "border-[#2563EB] bg-teal-50" : "border-slate-200 hover:border-[#2563EB]/50 hover:bg-slate-50"}`}
        data-testid="upload-zone"
      >
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} data-testid="input-file-upload" />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">{uploading ? "Uploading..." : "Drop a file here, or click to browse"}</p>
        <p className="text-xs text-slate-400 mt-1">Max 50 MB</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "mine"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${tab === t ? "bg-[#2563EB] text-white border-[#2563EB]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} data-testid={`tab-${t}`}>
            {t === "all" ? "All Files" : "My Uploads"}
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-2">
          {displayed.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No files yet.</p></div>
          ) : displayed.map((f: any) => (
            <Card key={f.id} className="border-0 shadow-sm" data-testid={`file-row-${f.id}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                {getIcon(f.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0F172A] truncate">{f.fileName}</p>
                  <p className="text-xs text-slate-400">{formatSize(f.fileSize)} · {new Date(f.createdAt).toLocaleDateString()} · {f.uploadedByRole === "employee" ? "From team" : "Your upload"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={`/api/client/files/${f.id}/download`} download className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-[#2563EB]" data-testid={`button-download-${f.id}`}><Download className="w-4 h-4" /></a>
                  {f.uploadedByRole !== "employee" && (
                    <button onClick={() => deleteFile(f.id)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500" data-testid={`button-delete-file-${f.id}`}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientFiles() {
  return (
    <PortalGuard allowedRoles={["client"]}>
      <ClientLayout><FilesContent /></ClientLayout>
    </PortalGuard>
  );
}
