import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Receipt, Plus, Download, Send, Check, X, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = { draft: "bg-slate-100 text-slate-600", submitted: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700", exported: "bg-purple-100 text-purple-700" };

function ExpensesContent() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [reportForm, setReportForm] = useState({ title: "", notes: "" });
  const [itemForm, setItemForm] = useState({ date: new Date().toISOString().split("T")[0], vendor: "", description: "", categoryId: "", amount: "", billable: false });

  useEffect(() => { document.title = "Expenses | handləkraft.ai"; load(); }, []);

  async function load() {
    setLoading(true);
    const [reportsRes, catsRes] = await Promise.all([apiRequest("GET", "/api/expenses/reports"), apiRequest("GET", "/api/expenses/categories")]);
    if (reportsRes.success) setReports(reportsRes.data);
    if (catsRes.success) setCategories(catsRes.data);
    setLoading(false);
  }

  async function loadReport(id: number) {
    const res = await apiRequest("GET", `/api/expenses/reports/${id}`);
    if (res.success) setActiveReport(res.data);
  }

  async function createReport(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/expenses/reports", reportForm);
    if (res.success) { setReports(prev => [res.data, ...prev]); setShowNewReport(false); setReportForm({ title: "", notes: "" }); }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiRequest("POST", "/api/expenses/items", { ...itemForm, reportId: activeReport.id, categoryId: itemForm.categoryId || null });
    if (res.success) { setShowAddItem(false); setItemForm({ date: new Date().toISOString().split("T")[0], vendor: "", description: "", categoryId: "", amount: "", billable: false }); loadReport(activeReport.id); }
  }

  async function submitReport(id: number) {
    await apiRequest("PATCH", `/api/expenses/reports/${id}/submit`);
    load();
    if (activeReport?.id === id) loadReport(id);
  }

  async function deleteItem(id: number) {
    await apiRequest("DELETE", `/api/expenses/items/${id}`);
    if (activeReport) loadReport(activeReport.id);
  }

  if (!activeReport) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Expenses</h1><p className="text-slate-500 text-sm">Track and submit expense reports for approval.</p></div>
        <Button onClick={() => setShowNewReport(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-report"><Plus className="w-4 h-4" /> New Report</Button>
      </div>
      {showNewReport && (
        <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">New Expense Report</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createReport} className="space-y-3">
              <input required value={reportForm.title} onChange={e => setReportForm(f => ({ ...f, title: e.target.value }))} placeholder="Report title *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-report-title" />
              <textarea value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#0D7377] text-white gap-1" data-testid="button-create-report"><Check className="w-4 h-4" /> Create</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewReport(false)}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div> : (
        <div className="space-y-3">
          {reports.length === 0 ? <div className="text-center py-16 text-slate-400"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No expense reports yet.</p></div> :
            reports.map((r: any) => (
              <Card key={r.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadReport(r.id)} data-testid={`card-report-${r.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1F2B]">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString()} · ${Number(r.totalAmount).toFixed(2)}</p>
                  </div>
                  <Badge className={`text-xs ${STATUS_COLORS[r.status] || ""}`}>{r.status}</Badge>
                </CardContent>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setActiveReport(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm" data-testid="button-back-reports"><ArrowLeft className="w-4 h-4" /> Reports</button>
        <div className="flex-1"><h1 className="text-lg font-display text-[#1A1F2B]">{activeReport.title}</h1></div>
        <div className="flex gap-2">
          {activeReport.status === "draft" && <Button size="sm" onClick={() => submitReport(activeReport.id)} className="bg-blue-600 text-white gap-1" data-testid="button-submit-report"><Send className="w-4 h-4" /> Submit</Button>}
          {(activeReport.status === "approved" || activeReport.status === "exported") && <>
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/expenses/reports/${activeReport.id}/export/csv`)} className="gap-1" data-testid="button-export-csv"><Download className="w-4 h-4" /> CSV</Button>
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/expenses/reports/${activeReport.id}/export/iif`)} className="gap-1" data-testid="button-export-iif"><Download className="w-4 h-4" /> QB IIF</Button>
          </>}
          <Badge className={`text-xs self-center ${STATUS_COLORS[activeReport.status] || ""}`}>{activeReport.status}</Badge>
        </div>
      </div>
      {activeReport.status === "draft" && (
        <div className="mb-4">
          {!showAddItem ? <Button onClick={() => setShowAddItem(true)} variant="outline" className="gap-2" data-testid="button-add-item"><Plus className="w-4 h-4" /> Add Item</Button> : (
            <Card className="border-[#0D7377]/20 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Add Expense Item</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={addItem} className="grid grid-cols-2 gap-3">
                  <input required type="date" value={itemForm.date} onChange={e => setItemForm(f => ({ ...f, date: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-item-date" />
                  <input required value={itemForm.vendor} onChange={e => setItemForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-item-vendor" />
                  <input required value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Description *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 col-span-2" data-testid="input-item-desc" />
                  <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-category">
                    <option value="">No Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.qbAccountCode})</option>)}
                  </select>
                  <input required type="number" step="0.01" min="0" value={itemForm.amount} onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount $" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-item-amount" />
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit" size="sm" className="bg-[#0D7377] text-white gap-1" data-testid="button-save-item"><Check className="w-4 h-4" /> Add</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddItem(false)}><X className="w-4 h-4" /> Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left pb-2 text-slate-500 font-medium">Date</th><th className="text-left pb-2 text-slate-500 font-medium">Vendor</th><th className="text-left pb-2 text-slate-500 font-medium">Description</th><th className="text-left pb-2 text-slate-500 font-medium">Category</th><th className="text-right pb-2 text-slate-500 font-medium">Amount</th><th className="pb-2"></th></tr></thead>
            <tbody>
              {activeReport.items?.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">No items yet. Add your first expense item.</td></tr> :
                activeReport.items?.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0" data-testid={`row-expense-${item.id}`}>
                    <td className="py-2 text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="py-2 text-slate-600">{item.vendor}</td>
                    <td className="py-2 text-slate-600 max-w-xs truncate">{item.description}</td>
                    <td className="py-2 text-slate-500 text-xs">{item.category?.name || "—"}</td>
                    <td className="py-2 text-right font-medium">${Number(item.amount).toFixed(2)}</td>
                    <td className="py-2 pl-2">
                      {activeReport.status === "draft" && <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500" data-testid={`button-delete-item-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot><tr className="border-t"><td colSpan={4} className="pt-3 font-semibold text-[#1A1F2B]">Total</td><td className="pt-3 text-right font-bold text-[#1A1F2B]">${Number(activeReport.totalAmount).toFixed(2)}</td><td /></tr></tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeExpenses() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><ExpensesContent /></EmployeeLayout>
    </PortalGuard>
  );
}
