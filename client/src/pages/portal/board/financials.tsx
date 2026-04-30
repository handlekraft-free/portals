import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { DollarSign } from "lucide-react";

function FinancialsContent() {
  return (
    <div>
      <h1 className="text-2xl font-display text-[#1A1F2B] mb-1">Financials</h1>
      <p className="text-slate-500 text-sm mb-8">Financial reports, budgets, and audit documents.</p>
      <div className="text-center py-20 text-slate-300">
        <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-slate-400 font-medium">Coming Soon</p>
        <p className="text-slate-300 text-sm mt-1">Financial reporting features will be available in a future update.</p>
      </div>
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
