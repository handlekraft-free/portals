import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Star, ArrowUpDown, Eye } from "lucide-react";
import type { FellowshipApplication, ClientApplication } from "@shared/schema";

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/admin/login", { username, password });
      onLogin();
    } catch (err: any) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1F2B]">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-2xl font-display text-[#1A1F2B] mb-6 text-center" data-testid="text-admin-login-heading">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={e => setUsername(e.target.value)} required data-testid="input-admin-username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required data-testid="input-admin-password" />
          </div>
          {error && <p className="text-sm text-red-600" data-testid="text-login-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-admin-login">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_review: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function RatingStars({ rating, onChange }: { rating: number; onChange: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5" data-testid={`button-star-${n}`}>
          <Star className={`w-4 h-4 ${n <= rating ? "fill-[#D4A843] text-[#D4A843]" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

function FellowshipQueue() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<FellowshipApplication | null>(null);

  const { data: applications = [], isLoading } = useQuery<FellowshipApplication[]>({
    queryKey: ["/api/admin/fellowship-applications"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; status?: string; rating?: number; priority?: number; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/fellowship-applications/${id}`, data);
      return res.json();
    },
    onSuccess: (updated: FellowshipApplication) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fellowship-applications"] });
      setSelected(updated);
      toast({ title: "Updated" });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <>
      {applications.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground" data-testid="text-no-fellowship-apps">No fellowship applications yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map(app => (
              <TableRow key={app.id} data-testid={`row-fellowship-${app.id}`}>
                <TableCell className="font-medium">{app.firstName} {app.lastName}</TableCell>
                <TableCell>{app.email}</TableCell>
                <TableCell>{app.location || "—"}</TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell>
                  <RatingStars rating={app.rating || 0} onChange={r => updateMutation.mutate({ id: app.id, rating: r })} />
                </TableCell>
                <TableCell>
                  <Select value={String(app.priority || 0)} onValueChange={v => updateMutation.mutate({ id: app.id, priority: parseInt(v) })}>
                    <SelectTrigger className="w-20" data-testid={`select-priority-fellowship-${app.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(app.submittedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setSelected(app)} data-testid={`button-view-fellowship-${app.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.firstName} {selected.lastName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-muted-foreground">Email:</span> {selected.email}</div>
                  <div><span className="font-medium text-muted-foreground">Phone:</span> {selected.phone || "—"}</div>
                  <div><span className="font-medium text-muted-foreground">Location:</span> {selected.location || "—"}</div>
                  <div><span className="font-medium text-muted-foreground">Submitted:</span> {new Date(selected.submittedAt).toLocaleString()}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Background</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selected.background}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Motivation</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selected.motivation}</p>
                </div>

                {selected.experience && (
                  <div>
                    <Label className="text-muted-foreground">Experience</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{selected.experience}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={v => updateMutation.mutate({ id: selected.id, status: v })}>
                      <SelectTrigger data-testid="select-detail-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <RatingStars rating={selected.rating || 0} onChange={r => updateMutation.mutate({ id: selected.id, rating: r })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    defaultValue={selected.adminNotes || ""}
                    onBlur={e => {
                      if (e.target.value !== (selected.adminNotes || "")) {
                        updateMutation.mutate({ id: selected.id, adminNotes: e.target.value });
                      }
                    }}
                    placeholder="Internal notes about this candidate..."
                    data-testid="input-admin-notes"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClientQueue() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<ClientApplication | null>(null);

  const { data: applications = [], isLoading } = useQuery<ClientApplication[]>({
    queryKey: ["/api/admin/client-applications"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; status?: string; rating?: number; priority?: number; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/client-applications/${id}`, data);
      return res.json();
    },
    onSuccess: (updated: ClientApplication) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/client-applications"] });
      setSelected(updated);
      toast({ title: "Updated" });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <>
      {applications.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground" data-testid="text-no-client-apps">No client applications yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map(app => (
              <TableRow key={app.id} data-testid={`row-client-${app.id}`}>
                <TableCell className="font-medium">{app.organizationName}</TableCell>
                <TableCell>{app.contactName}</TableCell>
                <TableCell>{app.organizationType}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    app.urgency === "high" ? "bg-red-100 text-red-800" :
                    app.urgency === "normal" ? "bg-blue-100 text-blue-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {app.urgency}
                  </span>
                </TableCell>
                <TableCell><StatusBadge status={app.status} /></TableCell>
                <TableCell>
                  <RatingStars rating={app.rating || 0} onChange={r => updateMutation.mutate({ id: app.id, rating: r })} />
                </TableCell>
                <TableCell>
                  <Select value={String(app.priority || 0)} onValueChange={v => updateMutation.mutate({ id: app.id, priority: parseInt(v) })}>
                    <SelectTrigger className="w-20" data-testid={`select-priority-client-${app.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(app.submittedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => setSelected(app)} data-testid={`button-view-client-${app.id}`}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.organizationName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-muted-foreground">Contact:</span> {selected.contactName}</div>
                  <div><span className="font-medium text-muted-foreground">Email:</span> {selected.contactEmail}</div>
                  <div><span className="font-medium text-muted-foreground">Phone:</span> {selected.contactPhone || "—"}</div>
                  <div><span className="font-medium text-muted-foreground">Location:</span> {selected.location || "—"}</div>
                  <div><span className="font-medium text-muted-foreground">Type:</span> {selected.organizationType}</div>
                  <div><span className="font-medium text-muted-foreground">Urgency:</span> {selected.urgency}</div>
                  <div><span className="font-medium text-muted-foreground">Submitted:</span> {new Date(selected.submittedAt).toLocaleString()}</div>
                </div>

                <div>
                  <Label className="text-muted-foreground">What they need</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selected.needs}</p>
                </div>

                {selected.currentTools && (
                  <div>
                    <Label className="text-muted-foreground">Current tools</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{selected.currentTools}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={selected.status} onValueChange={v => updateMutation.mutate({ id: selected.id, status: v })}>
                      <SelectTrigger data-testid="select-detail-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <RatingStars rating={selected.rating || 0} onChange={r => updateMutation.mutate({ id: selected.id, rating: r })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    defaultValue={selected.adminNotes || ""}
                    onBlur={e => {
                      if (e.target.value !== (selected.adminNotes || "")) {
                        updateMutation.mutate({ id: selected.id, adminNotes: e.target.value });
                      }
                    }}
                    placeholder="Internal notes about this organization..."
                    data-testid="input-admin-notes"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Admin() {
  const { data: admin, isLoading } = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const [loggedIn, setLoggedIn] = useState(false);

  const isAuthenticated = loggedIn || (admin && !isLoading);

  function handleLogout() {
    apiRequest("POST", "/api/admin/logout").then(() => {
      queryClient.clear();
      setLoggedIn(false);
      window.location.reload();
    });
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#1A1F2B] text-white">Loading...</div>;

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => { setLoggedIn(true); queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] }); }} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <header className="bg-[#1A1F2B] text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-display" data-testid="text-admin-heading">Handlekraft Digital — Admin</h1>
        <Button variant="ghost" className="text-white/70" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="mr-2 w-4 h-4" /> Sign Out
        </Button>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="fellowship">
          <TabsList className="mb-6" data-testid="tabs-admin">
            <TabsTrigger value="fellowship" data-testid="tab-fellowship">Fellowship Candidates</TabsTrigger>
            <TabsTrigger value="clients" data-testid="tab-clients">Client Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="fellowship">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h2 className="text-lg font-semibold text-[#1A1F2B]" data-testid="text-fellowship-queue-heading">Fellowship Applications</h2>
                <p className="text-sm text-muted-foreground">Review, rate, and prioritize fellowship candidates</p>
              </div>
              <FellowshipQueue />
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50/50">
                <h2 className="text-lg font-semibold text-[#1A1F2B]" data-testid="text-client-queue-heading">Client Requests</h2>
                <p className="text-sm text-muted-foreground">Review, rate, and prioritize organizations requesting help</p>
              </div>
              <ClientQueue />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
