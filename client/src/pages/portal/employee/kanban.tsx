import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { Plus, ArrowLeft, Kanban, X, Check, ChevronRight, User, Calendar, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRIORITY_COLORS: Record<string, string> = { urgent: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", medium: "bg-yellow-100 text-yellow-700 border-yellow-200", low: "bg-blue-100 text-blue-700 border-blue-200" };
const PRIORITY_BORDER: Record<string, string> = { urgent: "border-l-red-500", high: "border-l-orange-400", medium: "border-l-yellow-400", low: "border-l-blue-400" };

function KanbanContent() {
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState<number | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardDetail, setCardDetail] = useState<any>(null);
  const [newBoardName, setNewBoardName] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);

  useEffect(() => { document.title = "Kanban | handləkraft.ai"; loadBoards(); }, []);

  async function loadBoards() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/kanban/boards");
    if (res.success) setBoards(res.data);
    setLoading(false);
  }

  async function loadBoard(id: number) {
    const res = await apiRequest("GET", `/api/kanban/boards/${id}`);
    if (res.success) setActiveBoard(res.data);
  }

  async function createBoard() {
    if (!newBoardName.trim()) return;
    const res = await apiRequest("POST", "/api/kanban/boards", { name: newBoardName });
    if (res.success) { setBoards(prev => [...prev, res.data]); setNewBoardName(""); setShowNewBoard(false); }
  }

  async function addCard(columnId: number, boardId: number) {
    if (!newCardTitle.trim()) return;
    const res = await apiRequest("POST", "/api/kanban/cards", { columnId, boardId, title: newCardTitle });
    if (res.success) { setNewCardTitle(""); setAddingCard(null); loadBoard(boardId); }
  }

  async function addColumn() {
    const title = prompt("Column name:");
    if (!title || !activeBoard) return;
    await apiRequest("POST", `/api/kanban/boards/${activeBoard.id}/columns`, { title });
    loadBoard(activeBoard.id);
  }

  async function openCard(card: any) {
    setSelectedCard(card);
    const res = await apiRequest("GET", `/api/kanban/cards/${card.id}`);
    if (res.success) setCardDetail(res.data);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination || !activeBoard) return;
    const { draggableId, destination } = result;
    const cardId = parseInt(draggableId);
    const newColumnId = parseInt(destination.droppableId);
    const newPosition = destination.index;
    // Optimistic update
    const newBoard = { ...activeBoard, columns: activeBoard.columns.map((col: any) => ({ ...col, cards: col.cards.filter((c: any) => c.id !== cardId) })) };
    const card = activeBoard.columns.flatMap((c: any) => c.cards).find((c: any) => c.id === cardId);
    if (card) {
      const targetCol = newBoard.columns.find((c: any) => c.id === newColumnId);
      if (targetCol) targetCol.cards.splice(newPosition, 0, { ...card, columnId: newColumnId });
    }
    setActiveBoard(newBoard);
    await apiRequest("PATCH", `/api/kanban/cards/${cardId}`, { columnId: newColumnId, position: newPosition });
  }

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>;

  if (!activeBoard) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-display text-[#1A1F2B]">Kanban Boards</h1><p className="text-slate-500 text-sm mt-0.5">Your battle plans, organized by the gods.</p></div>
        <Button onClick={() => setShowNewBoard(true)} className="bg-[#0D7377] text-white gap-2" data-testid="button-new-board"><Plus className="w-4 h-4" /> New Board</Button>
      </div>
      {showNewBoard && (
        <Card className="mb-4 border-[#0D7377]/20 shadow-sm">
          <CardContent className="pt-4 flex gap-2">
            <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)} placeholder="Board name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" onKeyDown={e => e.key === "Enter" && createBoard()} data-testid="input-board-name" />
            <Button onClick={createBoard} className="bg-[#0D7377] text-white" data-testid="button-create-board"><Check className="w-4 h-4" /></Button>
            <Button variant="outline" onClick={() => setShowNewBoard(false)}><X className="w-4 h-4" /></Button>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.length === 0 ? (
          <div className="col-span-3 text-center py-16 text-slate-400"><Kanban className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No boards yet. Create your first board to organize work.</p></div>
        ) : boards.map((board: any) => (
          <Card key={board.id} className="cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm" onClick={() => loadBoard(board.id)} data-testid={`card-board-${board.id}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[#1A1F2B]">{board.name}</h3>
                  {board.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{board.description}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button onClick={() => setActiveBoard(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm" data-testid="button-back-boards"><ArrowLeft className="w-4 h-4" /> Boards</button>
        <h1 className="text-lg font-display text-[#1A1F2B]">{activeBoard.name}</h1>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "70vh" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {activeBoard.columns?.map((col: any) => (
            <div key={col.id} className="shrink-0 w-72 flex flex-col" data-testid={`kanban-column-${col.id}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold text-slate-700">{col.title}</span>
                  <Badge variant="secondary" className="text-xs">{col.cards?.length || 0}</Badge>
                </div>
              </div>
              <Droppable droppableId={String(col.id)}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-xl p-2 min-h-[200px] space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-[#0D7377]/10" : "bg-slate-100"}`}>
                    {col.cards?.map((card: any, index: number) => (
                      <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer border-l-4 ${PRIORITY_BORDER[card.priority] || "border-l-slate-200"} hover:shadow-md transition-shadow ${snapshot.isDragging ? "shadow-lg rotate-1" : ""}`}
                            onClick={() => openCard(card)} data-testid={`kanban-card-${card.id}`}>
                            <p className="text-sm font-medium text-[#1A1F2B] line-clamp-2">{card.title}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[card.priority] || ""}`}>{card.priority}</span>
                              {card.dueDate && <span className={`text-xs text-slate-400 flex items-center gap-0.5 ml-auto ${new Date(card.dueDate) < new Date() ? "text-red-500" : ""}`}><Calendar className="w-3 h-3" />{new Date(card.dueDate).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {addingCard === col.id ? (
                      <div className="bg-white rounded-lg p-2 shadow-sm">
                        <textarea autoFocus value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} placeholder="Card title..." rows={2} className="w-full text-sm border-0 outline-none resize-none" data-testid="input-new-card-title" />
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" className="bg-[#0D7377] text-white text-xs h-7" onClick={() => addCard(col.id, activeBoard.id)} data-testid="button-save-card"><Check className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setAddingCard(null); setNewCardTitle(""); }}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingCard(col.id)} className="w-full text-left text-sm text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-white transition-colors flex items-center gap-1" data-testid={`button-add-card-${col.id}`}><Plus className="w-3 h-3" /> Add card</button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </DragDropContext>
        <div className="shrink-0 w-12 flex items-start justify-center pt-10">
          <button onClick={addColumn} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-[#0D7377] hover:shadow-md transition-all" data-testid="button-add-column"><Plus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setSelectedCard(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1A1F2B] pr-4" data-testid="text-card-title">{selectedCard.title}</h2>
                <button onClick={() => setSelectedCard(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              {cardDetail ? (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded border ${PRIORITY_COLORS[cardDetail.priority] || ""}`}>Priority: {cardDetail.priority}</span>
                    {cardDetail.dueDate && <span className="text-xs text-slate-500 px-2 py-1 rounded border border-slate-200">Due: {new Date(cardDetail.dueDate).toLocaleDateString()}</span>}
                  </div>
                  {cardDetail.description && <p className="text-sm text-slate-600">{cardDetail.description}</p>}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comments ({cardDetail.comments?.length || 0})</h4>
                    {cardDetail.comments?.map((c: any) => (
                      <div key={c.id} className="bg-slate-50 rounded-lg p-3 mb-2">
                        <p className="text-xs font-medium text-slate-700">{c.firstName} {c.lastName}</p>
                        <p className="text-sm text-slate-600 mt-1">{c.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    <form onSubmit={async e => { e.preventDefault(); const input = (e.target as any).comment; await apiRequest("POST", `/api/kanban/cards/${selectedCard.id}/comments`, { content: input.value }); input.value = ""; const res = await apiRequest("GET", `/api/kanban/cards/${selectedCard.id}`); if (res.success) setCardDetail(res.data); }}>
                      <div className="flex gap-2 mt-2">
                        <input name="comment" placeholder="Add a comment..." className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30" data-testid="input-card-comment" />
                        <Button type="submit" size="sm" className="bg-[#0D7377] text-white" data-testid="button-add-comment">Add</Button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmployeeKanban() {
  return (
    <PortalGuard allowedRoles={["admin", "employee", "student"]}>
      <EmployeeLayout><KanbanContent /></EmployeeLayout>
    </PortalGuard>
  );
}
