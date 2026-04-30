import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { DollarSign, TrendingUp, TrendingDown, Minus, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function FinancialsContent() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    document.title = "Financials | handləkraft.ai";
    apiRequest("GET", "/api/board/financials").then(r => {
      if (r.success) setRecords(r.data || []);
      setLoading(false);
    });
  }, []);

  const latest = records[0];

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-500" /> Financials
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Financial reports, budgets, and audit documents for board review.</p>
        </div>
        {isAdmin && (
          <Button className="bg-indigo-500 text-white gap-2 opacity-50 cursor-not-allowed" disabled data-testid="button-add-financial">
            <Plus className="w-4 h-4" /> Add Report
          </Button>
        )}
      </div>

      {latest ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm" data-testid="card-total-assets">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-[#1A1F2B]">{formatCurrency(latest.totalAssets ?? 0)}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="card-total-liabilities">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Liabilities</p>
                    <p className="text-2xl font-bold text-[#1A1F2B]">{formatCurrency(latest.totalLiabilities ?? 0)}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm" data-testid="card-net-assets">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Net Assets</p>
                    <p className="text-2xl font-bold text-[#1A1F2B]">{formatCurrency((latest.totalAssets ?? 0) - (latest.totalLiabilities ?? 0))}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Minus className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Financial Report History</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-slate-100">
                {records.map(r => (
                  <div key={r.id} className="py-3 flex items-center justify-between" data-testid={`financial-${r.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1F2B]">{r.reportType || "Financial Report"}</p>
                        <p className="text-xs text-slate-400">As of {new Date(r.asOfDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{r.period || "Annual"}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-24">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">No financial records yet</p>
          <p className="text-slate-300 text-sm mt-1">Financial reports uploaded by the treasurer will appear here.</p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            {[
              { label: "Form 990", desc: "Annual tax return for nonprofits", icon: "📄" },
              { label: "Budget", desc: "Approved annual operating budget", icon: "📊" },
              { label: "Audit Report", desc: "Independent financial audit", icon: "🔍" },
            ].map(item => (
              <Card key={item.label} className="border border-dashed border-slate-200 shadow-none bg-slate-50">
                <CardContent className="pt-4 pb-4 text-center">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-sm font-semibold text-slate-600 mt-2">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
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
