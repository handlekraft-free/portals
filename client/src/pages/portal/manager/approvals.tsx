import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Check, X, Clock, Receipt, AlertCircle } from "lucide-react";
import { BRAND } from "@shared/branding";

type Tab = "timesheets" | "expenses";

interface PendingTimesheet {
  id: number;
  employeeId: number;
  periodStart: string;
  periodEnd: string;
  totalHours: string;
  status: string;
  notes?: string | null;
  submittedAt?: string | null;
  employeeFirstName: string;
  employeeLastName: string;
  employeeEmail: string;
}

interface PendingExpense {
  id: number;
  userId: number;
  title: string;
  status: string;
  totalAmount: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  notes?: string | null;
  submittedAt?: string | null;
  employeeFirstName?: string;
  employeeLastName?: string;
  employeeEmail?: string;
}

function fmtRange(start?: string | null, end?: string | null): string {
  if (!start) return "—";
  const s = new Date(start).toLocaleDateString();
  const e = end ? new Date(end).toLocaleDateString() : "";
  return e ? `${s} – ${e}` : s;
}

function fmtMoney(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ApprovalsContent() {
  const [location] = useLocation();
  const initialTab: Tab = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    return params.get("tab") === "expenses" ? "expenses" : "timesheets";
  }, [location]);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [timesheets, setTimesheets] = useState<PendingTimesheet[]>([]);
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    document.title = `Approvals | ${BRAND.fullName}`;
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [tRes, eRes] = await Promise.all([
      apiRequest("GET", "/api/time/reports?all=1"),
      apiRequest("GET", "/api/expenses/reports?all=1"),
    ]);
    if (tRes.success) setTimesheets(tRes.data);
    if (eRes.success) setExpenses((eRes.data as PendingExpense[]).filter(r => r.status === "submitted"));
    setLoading(false);
  }

  async function approveTimesheet(id: number) {
    setBusyId(id);
    const res = await apiRequest("PATCH", `/api/time/reports/${id}/approve`, {});
    setBusyId(null);
    if (res.success) setTimesheets(prev => prev.filter(t => t.id !== id));
  }

  async function rejectTimesheet(id: number) {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    setBusyId(id);
    const res = await apiRequest("PATCH", `/api/time/reports/${id}/reject`, { reason });
    setBusyId(null);
    if (res.success) setTimesheets(prev => prev.filter(t => t.id !== id));
  }

  async function approveExpense(id: number) {
    setBusyId(id);
    const res = await apiRequest("PATCH", `/api/expenses/reports/${id}/approve`, {});
    setBusyId(null);
    if (res.success) setExpenses(prev => prev.filter(e => e.id !== id));
  }

  async function rejectExpense(id: number) {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    setBusyId(id);
    const res = await apiRequest("PATCH", `/api/expenses/reports/${id}/reject`, { reason });
    setBusyId(null);
    if (res.success) setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const tabBtn = (id: Tab, label: string, count: number, icon: JSX.Element) => (
    <button
      onClick={() => setTab(id)}
      data-testid={`tab-approvals-${id}`}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        tab === id
          ? "bg-[#7C3AED] text-white"
          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <Badge className={`ml-1 ${tab === id ? "bg-white/25 text-white border-0" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
          {count}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto p-2 space-y-6">
      <div>
        <h1 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[#7C3AED]" /> Approvals
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review and decide on submitted timesheets and expense reports.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("timesheets", "Timesheets", timesheets.length, <Clock className="w-4 h-4" />)}
        {tabBtn("expenses", "Expenses", expenses.length, <Receipt className="w-4 h-4" />)}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : tab === "timesheets" ? (
        timesheets.length === 0 ? (
          <EmptyState icon={<Clock className="w-10 h-10" />} text="No timesheets waiting for review." />
        ) : (
          <div className="space-y-3">
            {timesheets.map(t => (
              <Card key={t.id} className="border border-slate-100 shadow-sm" data-testid={`card-timesheet-${t.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="font-semibold">
                      {t.employeeFirstName} {t.employeeLastName}
                    </span>
                    <span className="text-xs text-slate-500 font-normal">
                      {fmtRange(t.periodStart, t.periodEnd)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span><span className="font-semibold">{t.totalHours}h</span> total</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-400 truncate">{t.employeeEmail}</span>
                    {t.notes && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="italic text-slate-500 truncate" title={t.notes}>"{t.notes}"</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => approveTimesheet(t.id)}
                      disabled={busyId === t.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                      data-testid={`button-approve-timesheet-${t.id}`}
                    >
                      <Check className="w-4 h-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectTimesheet(t.id)}
                      disabled={busyId === t.id}
                      className="gap-2"
                      data-testid={`button-reject-timesheet-${t.id}`}
                    >
                      <X className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : expenses.length === 0 ? (
        <EmptyState icon={<Receipt className="w-10 h-10" />} text="No expense reports waiting for review." />
      ) : (
        <div className="space-y-3">
          {expenses.map(e => (
            <Card key={e.id} className="border border-slate-100 shadow-sm" data-testid={`card-expense-${e.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="font-semibold">
                    {e.employeeFirstName ? `${e.employeeFirstName} ${e.employeeLastName}` : e.title}
                  </span>
                  <span className="text-sm text-slate-700 font-semibold tabular-nums">
                    {fmtMoney(e.totalAmount ?? 0)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="font-medium">{e.title}</span>
                  {(e.periodStart || e.periodEnd) && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span>{fmtRange(e.periodStart, e.periodEnd)}</span>
                    </>
                  )}
                  {e.employeeEmail && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-400 truncate">{e.employeeEmail}</span>
                    </>
                  )}
                </div>
                {e.notes && <p className="text-xs text-slate-500 italic">"{e.notes}"</p>}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => approveExpense(e.id)}
                    disabled={busyId === e.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    data-testid={`button-approve-expense-${e.id}`}
                  >
                    <Check className="w-4 h-4" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => rejectExpense(e.id)}
                    disabled={busyId === e.id}
                    className="gap-2"
                    data-testid={`button-reject-expense-${e.id}`}
                  >
                    <X className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: JSX.Element; text: string }) {
  return (
    <div className="text-center py-16 text-slate-400">
      <div className="mx-auto mb-3 opacity-30 flex justify-center">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function ManagerApprovals() {
  return (
    <PortalGuard allowedRoles={["admin", "manager"]}>
      <EmployeeLayout>
        <ApprovalsContent />
      </EmployeeLayout>
    </PortalGuard>
  );
}
