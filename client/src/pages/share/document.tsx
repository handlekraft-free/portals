import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { FileText, Download, Lock, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@shared/branding";

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function SharedDocument() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = `Shared Document | ${BRAND.name}`;
    fetch(`/api/public/board/document/${token}`)
      .then(r => r.json())
      .then(r => {
        if (r.success) {
          setDoc(r.data);
          document.title = `${r.data.title} | ${BRAND.name}`;
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#1A1F2B] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0D7377] flex items-center justify-center">
            <span className="text-white font-bold text-sm font-display">HK</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 text-sm">
            <span className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              handl<span style={{ fontFamily: "Georgia, serif" }}>ə</span>kraft
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span>Shared Document</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="space-y-3 animate-pulse">
                <div className="h-6 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                <div className="h-4 bg-slate-100 rounded-lg w-full" />
                <div className="h-10 bg-slate-100 rounded-xl w-40 mt-6" />
              </div>
            </div>
          )}

          {!loading && notFound && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-[#1A1F2B] mb-2">Link not found</h1>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                This document link is either invalid or has been revoked. Please contact the person who shared it with you.
              </p>
            </div>
          )}

          {!loading && doc && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Document header */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 px-8 py-8">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide mb-1">
                      {doc.category}
                      {doc.currentVersion && ` · v${doc.currentVersion}`}
                    </p>
                    <h1 className="text-2xl font-bold text-white leading-tight">{doc.title}</h1>
                    {doc.description && (
                      <p className="text-indigo-200 text-sm mt-2 leading-relaxed">{doc.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* File info + download */}
              <div className="px-8 py-6">
                {doc.hasFile ? (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      {doc.fileName && (
                        <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                          <p className="text-xs text-slate-400 mb-0.5">File</p>
                          <p className="text-sm font-medium text-[#1A1F2B] truncate">{doc.fileName}</p>
                          {doc.fileSize && (
                            <p className="text-xs text-slate-400 mt-0.5">{formatBytes(doc.fileSize)}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <a
                      href={`/api/public/board/document/${token}/download`}
                      download
                      data-testid="button-download-shared"
                    >
                      <Button className="bg-[#0D7377] hover:bg-[#0a5f63] text-white px-6 py-2.5 rounded-xl flex items-center gap-2 w-full sm:w-auto justify-center">
                        <Download className="w-4 h-4" />
                        Download Document
                      </Button>
                    </a>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-slate-400 py-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm">No file is attached to this document yet.</p>
                  </div>
                )}
              </div>

              {/* Footer note */}
              <div className="border-t border-slate-100 px-8 py-4 flex items-center gap-2 text-xs text-slate-400">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  This document was shared by <strong className="text-slate-500">handl<span style={{ fontFamily: "Georgia, serif" }}>ə</span>kraft</strong> via a secure, access-controlled link. Do not redistribute without permission.
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()}{" "}
        <span className="font-medium text-slate-500">{BRAND.name}</span>
        {" "}· {BRAND.fullName}
      </footer>
    </div>
  );
}
