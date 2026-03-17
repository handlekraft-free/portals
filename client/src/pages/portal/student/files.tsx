import { useEffect, useState, useRef } from "react";
import { StudentLayout } from "@/components/portal/StudentLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { FolderOpen, Upload, Download, File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function formatSize(bytes: number) { if (!bytes) return "—"; const kb = bytes / 1024; if (kb < 1024) return `${Math.round(kb)} KB`; return `${Math.round(kb / 1024 * 10) / 10} MB`; }

function StudentFilesContent() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Files | handləkraft.ai"; load(); }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/student/files");
    if (res.success) setFiles(res.data);
    setLoading(false);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/student/files", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    if (data.success) setFiles(prev => [data.data, ...prev]);
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) uploadFile(f);
  }

  const fromInstructor = files.filter(f => f.uploadedByRole !== "student");
  const mine = files.filter(f => f.uploadedByRole === "student");

  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">Files</h1>
      <p className="text-slate-500 text-sm mb-5">Files from your instructors and your assignment uploads.</p>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer transition-colors ${dragOver ? "border-purple-400 bg-purple-50" : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"}`}
        data-testid="upload-zone"
      >
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} data-testid="input-file" />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600">{uploading ? "Uploading..." : "Drop assignment here, or click to browse"}</p>
        <p className="text-xs text-slate-400 mt-1">Max 50 MB</p>
      </div>

      <div className="space-y-6">
        {[{ label: "From Instructors", data: fromInstructor }, { label: "My Uploads", data: mine }].map(section => (
          <div key={section.label}>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">{section.label}</h3>
            {loading ? <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div> :
              section.data.length === 0 ? <p className="text-sm text-slate-400 px-2">None yet.</p> :
                section.data.map((f: any) => (
                  <Card key={f.id} className="border-0 shadow-sm mb-2" data-testid={`file-row-${f.id}`}>
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      <File className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A1F2B] truncate">{f.fileName}</p>
                        <p className="text-xs text-slate-400">{formatSize(f.fileSize)} · {new Date(f.createdAt).toLocaleDateString()}</p>
                      </div>
                      <a href={`/api/student/files/${f.id}/download`} download className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-[#0D7377]" data-testid={`button-download-${f.id}`}><Download className="w-4 h-4" /></a>
                    </CardContent>
                  </Card>
                ))
            }
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentFiles() {
  return (
    <PortalGuard allowedRoles={["student"]}>
      <StudentLayout><StudentFilesContent /></StudentLayout>
    </PortalGuard>
  );
}
