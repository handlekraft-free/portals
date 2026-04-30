import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { BookOpen } from "lucide-react";

function OnboardingContent() {
  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2 mb-1"><BookOpen className="w-6 h-6 text-indigo-500" /> Board Onboarding</h1>
      <p className="text-slate-500 text-sm mb-8">Required reading, policies, and orientation materials for new board members.</p>
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-200" />
        <p className="text-slate-400 font-medium">Onboarding Portal Coming Soon</p>
        <p className="text-slate-300 text-sm mt-1">Board onboarding checklists and required acknowledgments will appear here.</p>
      </div>
    </div>
  );
}

export default function BoardOnboarding() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><OnboardingContent /></BoardLayout>
    </PortalGuard>
  );
}
