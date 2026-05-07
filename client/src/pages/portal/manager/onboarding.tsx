import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Plus, Pencil, Trash2, X, Globe, ExternalLink, Save,
} from "lucide-react";
import { BRAND } from "@shared/branding";
import { useToast } from "@/hooks/use-toast";

interface OnboardingItem {
  id: number;
  title: string;
  description: string | null;
  link_url: string | null;
  section: string | null;
  estimated_time: string | null;
  role_filter: string;
  position: number;
}

interface FormState {
  title: string;
  description: string;
  linkUrl: string;
  section: string;
  estimatedTime: string;
  roleFilter: string;
  position: number;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  linkUrl: "",
  section: "",
  estimatedTime: "",
  roleFilter: "all",
  position: 99,
};

const ROLE_LABEL: Record<string, string> = {
  all: "All employees",
  tools_lead: "Tools & Dev Lead",
  marketing_lead: "Marketing Lead",
};

function ItemEditor({
  initial,
  onCancel,
  onSave,
  saving,
  title,
}: {
  initial: FormState;
  onCancel: () => void;
  onSave: (form: FormState) => void;
  saving: boolean;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!form.title.trim()) return;
    let url = form.linkUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    onSave({ ...form, linkUrl: url });
  }

  return (
    <Card className="border border-violet-200 shadow-sm bg-violet-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={form.title}
          onChange={e => update("title", e.target.value)}
          placeholder="Title *"
          data-testid="input-onboarding-title"
        />
        <textarea
          value={form.description}
          onChange={e => update("description", e.target.value)}
          placeholder="Description / why this matters…"
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
          data-testid="textarea-onboarding-desc"
        />
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={form.linkUrl}
            onChange={e => update("linkUrl", e.target.value)}
            placeholder="Web link URL (optional)"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            data-testid="input-onboarding-link"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={form.section}
            onChange={e => update("section", e.target.value)}
            placeholder="Section label"
            data-testid="input-onboarding-section"
          />
          <Input
            value={form.estimatedTime}
            onChange={e => update("estimatedTime", e.target.value)}
            placeholder="Est. time (e.g. ~15 min)"
            data-testid="input-onboarding-time"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.roleFilter}
            onChange={e => update("roleFilter", e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            data-testid="select-onboarding-role"
          >
            <option value="all">All employees</option>
            <option value="tools_lead">Tools &amp; Development Lead only</option>
            <option value="marketing_lead">Marketing &amp; Social Media Lead only</option>
          </select>
          <Input
            type="number"
            value={form.position}
            onChange={e => update("position", parseInt(e.target.value) || 99)}
            placeholder="Position (sort order)"
            data-testid="input-onboarding-position"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-1.5 flex-1"
            data-testid="button-save-onboarding-item"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OnboardingAdminContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `Edit Onboarding | ${BRAND.fullName}`;
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await apiRequest("GET", "/api/lms/onboarding");
    if (res.success) setItems(res.data ?? []);
    setLoading(false);
  }

  async function createItem(form: FormState) {
    setBusy(true);
    const res = await apiRequest("POST", "/api/lms/onboarding/items", form);
    setBusy(false);
    if (res.success) {
      toast({ title: "Item added" });
      setAdding(false);
      load();
    } else {
      toast({ title: "Couldn't save", description: res.error, variant: "destructive" });
    }
  }

  async function updateItem(id: number, form: FormState) {
    setBusy(true);
    const res = await apiRequest("PATCH", `/api/lms/onboarding/items/${id}`, form);
    setBusy(false);
    if (res.success) {
      toast({ title: "Item updated" });
      setEditingId(null);
      load();
    } else {
      toast({ title: "Couldn't update", description: res.error, variant: "destructive" });
    }
  }

  async function deleteItem(id: number) {
    if (!window.confirm("Delete this item? Employees who already acknowledged it will lose that record.")) return;
    setBusy(true);
    const res = await apiRequest("DELETE", `/api/lms/onboarding/items/${id}`);
    setBusy(false);
    if (res.success) {
      toast({ title: "Item deleted" });
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      toast({ title: "Couldn't delete", description: res.error, variant: "destructive" });
    }
  }

  const sections = items.reduce<Record<string, OnboardingItem[]>>((acc, it) => {
    const key = it.section || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto p-2 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display text-[#0F172A] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#7C3AED]" /> Edit Onboarding Content
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Curate the reading list and resources new employees see. Items are grouped by section, sorted by position.
          </p>
        </div>
        {!adding && (
          <Button
            onClick={() => setAdding(true)}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white gap-1.5"
            data-testid="button-add-onboarding-item"
          >
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        )}
      </div>

      {adding && (
        <ItemEditor
          title="New onboarding item"
          initial={EMPTY_FORM}
          saving={busy}
          onCancel={() => setAdding(false)}
          onSave={createItem}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No onboarding items yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sections).map(([section, sectionItems]) => (
            <div key={section}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                {section}
              </h2>
              <div className="space-y-2">
                {sectionItems.map(it => (
                  editingId === it.id ? (
                    <ItemEditor
                      key={it.id}
                      title={`Editing: ${it.title}`}
                      initial={{
                        title: it.title,
                        description: it.description ?? "",
                        linkUrl: it.link_url ?? "",
                        section: it.section ?? "",
                        estimatedTime: it.estimated_time ?? "",
                        roleFilter: it.role_filter,
                        position: it.position,
                      }}
                      saving={busy}
                      onCancel={() => setEditingId(null)}
                      onSave={(form) => updateItem(it.id, form)}
                    />
                  ) : (
                    <Card key={it.id} className="border border-slate-100 shadow-sm" data-testid={`card-onboarding-item-${it.id}`}>
                      <CardContent className="py-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#0F172A]">{it.title}</p>
                          {it.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{it.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {it.estimated_time && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {it.estimated_time}
                              </Badge>
                            )}
                            {it.role_filter !== "all" && (
                              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs px-1.5 py-0">
                                {ROLE_LABEL[it.role_filter] ?? it.role_filter}
                              </Badge>
                            )}
                            {it.link_url && (
                              <a
                                href={it.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#2563EB] hover:underline flex items-center gap-1"
                                data-testid={`link-preview-${it.id}`}
                              >
                                <ExternalLink className="w-3 h-3" /> {it.link_url.replace(/^https?:\/\//, "").slice(0, 40)}
                              </a>
                            )}
                            <span className="text-xs text-slate-400">pos {it.position}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingId(it.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#7C3AED]"
                            title="Edit"
                            data-testid={`button-edit-onboarding-${it.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(it.id)}
                            disabled={busy}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 disabled:opacity-40"
                            title="Delete"
                            data-testid={`button-delete-onboarding-${it.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerOnboardingAdmin() {
  return (
    <PortalGuard allowedRoles={["admin", "manager"]}>
      <EmployeeLayout>
        <OnboardingAdminContent />
      </EmployeeLayout>
    </PortalGuard>
  );
}
