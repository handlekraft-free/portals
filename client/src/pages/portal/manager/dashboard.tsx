import { useEffect, useState } from "react";
import { Link } from "wouter";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Clock, Receipt, GraduationCap, Kanban,
  AlertCircle, ArrowRight,
} from "lucide-react";
import { BRAND } from "@shared/branding";

interface ManagerStats {
  pendingTimesheets: number;
  pendingExpenses: number;
}

function ManagerDashboardContent() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Manager Dashboard | ${BRAND.fullName}`;
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/manager/approval-counts");
    if (res.success) setStats(res.data);
    setLoading(false);
  }

  const totalPending = (stats?.pendingTimesheets ?? 0) + (stats?.pendingExpenses ?? 0);

  return (
    <div className="max-w-5xl mx-auto p-2 space-y-6">
      <div>
        <h1 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#7C3AED]" /> Manager Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Approvals, factory quests, and onboarding content — at a glance.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {totalPending > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    {totalPending} item{totalPending === 1 ? "" : "s"} waiting for your review
                  </p>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    {stats!.pendingTimesheets} timesheet{stats!.pendingTimesheets === 1 ? "" : "s"}
                    {" · "}
                    {stats!.pendingExpenses} expense report{stats!.pendingExpenses === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Link href="/portal/manager/approvals">
                <Button className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5">
                  Review now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-[#2563EB]" /> Timesheet Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-display text-[#0F172A]" data-testid="text-pending-timesheets">
                    {stats?.pendingTimesheets ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">submitted, awaiting review</p>
                </div>
                <Link href="/portal/manager/approvals?tab=timesheets">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Review <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                  <Receipt className="w-4 h-4 text-amber-500" /> Expense Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-display text-[#0F172A]" data-testid="text-pending-expenses">
                    {stats?.pendingExpenses ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">submitted, awaiting review</p>
                </div>
                <Link href="/portal/manager/approvals?tab=expenses">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Review <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/portal/employee/kanban?tab=factory">
              <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <Kanban className="w-4 h-4 text-emerald-500" /> Longship Factory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Add quest cards to the shared backlog for the team to claim.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    Open factory <ArrowRight className="w-3 h-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portal/manager/onboarding">
              <Card className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                    <GraduationCap className="w-4 h-4 text-violet-500" /> Onboarding Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Curate the reading list and resources new employees see in their onboarding flow.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    Edit content <ArrowRight className="w-3 h-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <PortalGuard allowedRoles={["admin", "manager"]}>
      <EmployeeLayout>
        <ManagerDashboardContent />
      </EmployeeLayout>
    </PortalGuard>
  );
}
