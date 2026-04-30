import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { Settings } from "lucide-react";

function BoardSettingsContent() {
  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2 mb-1"><Settings className="w-6 h-6 text-amber-500" /> Board Settings</h1>
      <p className="text-slate-500 text-sm mb-8">Configure board governance parameters and quorum rules.</p>
      <div className="text-center py-20 text-slate-300">
        <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-slate-400 font-medium">Coming Soon</p>
        <p className="text-slate-300 text-sm mt-1">Board governance settings will be configurable in a future update.</p>
      </div>
    </div>
  );
}

export default function BoardSettings() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><BoardSettingsContent /></BoardLayout>
    </PortalGuard>
  );
}
