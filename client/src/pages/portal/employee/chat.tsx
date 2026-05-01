import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import TeamChat from "@/components/portal/TeamChat";
import ClaudeChat from "@/components/portal/ClaudeChat";
import { MessageSquare } from "lucide-react";
import { useEffect } from "react";

function ChatContent() {
  useEffect(() => { document.title = "Communication | handləkraft.ai"; }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-[#0D7377]" />
        <h1 className="text-2xl font-display text-[#1A1F2B]">Communication Hub</h1>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0D7377] inline-block" /> Team Chat
          </p>
          <TeamChat />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1A1F2B] inline-block" /> AI Assistant
          </p>
          <ClaudeChat />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeChat() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><ChatContent /></EmployeeLayout>
    </PortalGuard>
  );
}
