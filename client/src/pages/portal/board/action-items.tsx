import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { CheckSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ActionItemsContent() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "My Action Items | handləkraft.ai";
    apiRequest("GET", "/api/board/my-action-items").then(r => {
      if (r.success) setItems(r.data);
      setLoading(false);
    });
  }, []);

  async function markComplete(id: number) {
    await apiRequest("PATCH", `/api/board/action-items/${id}`, { status: "complete" });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>;

  const overdue = items.filter(i => i.dueDate && new Date(i.dueDate) < new Date());
  const upcoming = items.filter(i => !(i.dueDate && new Date(i.dueDate) < new Date()));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#1A1F2B]">My Action Items</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tasks assigned to you from board meeting minutes.</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">All caught up!</p><p className="text-xs mt-1">No open action items assigned to you.</p></div>
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">⚠ Overdue ({overdue.length})</p>
              <div className="space-y-2">
                {overdue.map(item => (
                  <Card key={item.id} className="border-0 shadow-sm border-l-4 border-l-red-400" data-testid={`action-${item.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <CheckSquare className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F2B]">{item.title}</p>
                          {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                          <p className="text-xs text-red-500 mt-0.5">Overdue: {new Date(item.dueDate).toLocaleDateString()}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => markComplete(item.id)} data-testid={`button-complete-${item.id}`}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              {overdue.length > 0 && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Open ({upcoming.length})</p>}
              <div className="space-y-2">
                {upcoming.map(item => (
                  <Card key={item.id} className="border-0 shadow-sm border-l-4 border-l-amber-400" data-testid={`action-${item.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <CheckSquare className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1F2B]">{item.title}</p>
                          {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                          {item.dueDate && <p className="text-xs text-slate-400 mt-0.5">Due: {new Date(item.dueDate).toLocaleDateString()}</p>}
                        </div>
                        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 hover:bg-green-50 hover:text-green-600 hover:border-green-200" onClick={() => markComplete(item.id)} data-testid={`button-complete-${item.id}`}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BoardActionItems() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><ActionItemsContent /></BoardLayout>
    </PortalGuard>
  );
}
