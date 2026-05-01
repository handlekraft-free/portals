import { useEffect, useState } from "react";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import {
  GraduationCap, CheckCircle2, Circle, Plus, ChevronDown, ChevronUp,
  ExternalLink, Globe, Clock, Calendar, ChevronRight, Sparkles,
  Heart, Cpu, Wrench, Code2, Megaphone, Building2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── Section metadata ───────────────────────────────────────────────────────────

const SECTION_META = {
  "Part 1: How We Work Together": {
    icon: <Heart className="w-5 h-5" />,
    color: "text-violet-600",
    ring: "ring-violet-200",
    bg: "bg-violet-50",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    week: "Week 1",
    blurb: "Team culture, operating philosophy, and the deep-work habits that make a short week more productive.",
  },
  "Part 2: Working With AI as a Co-Worker": {
    icon: <Cpu className="w-5 h-5" />,
    color: "text-teal-600",
    ring: "ring-teal-200",
    bg: "bg-teal-50",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
    week: "Week 2",
    blurb: "Both roles use Claude every day. This week builds the prompting vocabulary you'll use from day one.",
  },
  "Part 3: Doing the Work Well": {
    icon: <Wrench className="w-5 h-5" />,
    color: "text-amber-600",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    week: "Week 3",
    blurb: "Managing projects, clients, and your own time — and understanding what it means to do work that actually matters.",
  },
  "Part 4A: Tools & Development Lead": {
    icon: <Code2 className="w-5 h-5" />,
    color: "text-indigo-600",
    ring: "ring-indigo-200",
    bg: "bg-indigo-50",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
    week: "Weeks 4–6",
    blurb: "Role-specific deep dives: Claude Code, professional dev practices, Replit, Git, and twelve-factor architecture.",
  },
  "Part 4B: Marketing & Social Media Lead": {
    icon: <Megaphone className="w-5 h-5" />,
    color: "text-rose-600",
    ring: "ring-rose-200",
    bg: "bg-rose-50",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    week: "Weeks 4–6",
    blurb: "Role-specific deep dives: nonprofit messaging frameworks, donor storytelling, writing craft, email strategy.",
  },
  "Part 5: handləkraft-Specific": {
    icon: <Building2 className="w-5 h-5" />,
    color: "text-slate-600",
    ring: "ring-slate-300",
    bg: "bg-slate-50",
    badge: "bg-slate-100 text-slate-600 border-slate-300",
    week: "Ongoing",
    blurb: "Our shared map — the proposal, the Tier 1 curriculum, and the Tier 2 direction we're heading.",
  },
};

const DEFAULT_META = {
  icon: <GraduationCap className="w-5 h-5" /> as JSX.Element,
  color: "text-slate-600",
  ring: "ring-slate-200",
  bg: "bg-slate-50",
  badge: "bg-slate-100 text-slate-700 border-slate-200",
  week: "",
  blurb: "",
};

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  tools_lead:     { label: "Tools & Dev", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  marketing_lead: { label: "Marketing",   cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

// ── Weekly plan ────────────────────────────────────────────────────────────────

const WEEKLY_PLAN = [
  { week: "Week 1", focus: "NVC + Reinventing Organizations + Deep Work", est: "~1 hr" },
  { week: "Week 2", focus: "Anthropic tutorial + best practices + Mollick", est: "~4 hrs" },
  { week: "Week 3", focus: "Zhuo + Victor + handləkraft proposal", est: "~2 hrs" },
  { week: "Week 4", focus: "Role-specific reading begins", est: "2–3 hrs" },
  { week: "Week 5", focus: "Role-specific reading continues", est: "2–3 hrs" },
  { week: "Week 6", focus: "Tier 1/Tier 2 plans + role-specific wrap-up", est: "2–3 hrs" },
  { week: "Ongoing", focus: "Mollick's Substack, Kanter's blog, BoardSource, etc.", est: "Subscribe" },
];

// ── Add Item Modal ─────────────────────────────────────────────────────────────

function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", linkUrl: "", section: "",
    estimatedTime: "", roleFilter: "all", position: 99,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    let url = form.linkUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    await apiRequest("POST", "/api/lms/onboarding/items", { ...form, linkUrl: url || undefined });
    onSaved();
    onClose();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <p className="font-semibold text-[#1A1F2B]">Add Onboarding Item</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" data-testid="button-close-add-item"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-onboarding-title" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description or context…" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" data-testid="textarea-onboarding-desc" />
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-400" />
            <input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="Web link URL (optional)" className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" data-testid="input-onboarding-link" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder="Section label" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-onboarding-section" />
            <input value={form.estimatedTime} onChange={e => setForm(f => ({ ...f, estimatedTime: e.target.value }))} placeholder="Est. time (e.g. ~15 min)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" data-testid="input-onboarding-time" />
          </div>
          <select value={form.roleFilter} onChange={e => setForm(f => ({ ...f, roleFilter: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" data-testid="select-onboarding-role">
            <option value="all">All employees</option>
            <option value="tools_lead">Tools &amp; Development Lead only</option>
            <option value="marketing_lead">Marketing &amp; Social Media Lead only</option>
          </select>
          <div className="flex gap-2 pt-1">
            <Button onClick={save} disabled={saving || !form.title.trim()} className="bg-[#0D7377] hover:bg-teal-700 text-white flex-1" data-testid="button-save-onboarding">
              {saving ? "Saving…" : "Add Item"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reading Card ───────────────────────────────────────────────────────────────

function ReadingCard({
  item,
  index,
  meta,
  onAck,
}: {
  item: any;
  index: number;
  meta: typeof DEFAULT_META;
  onAck: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const acked = item.acked === true || item.acked === "true";
  const roleMeta = item.role_filter && item.role_filter !== "all" ? ROLE_BADGE[item.role_filter] : null;

  return (
    <div
      className={`rounded-xl border transition-all ${acked ? "bg-slate-50 border-slate-100 opacity-75" : "bg-white border-slate-100 shadow-sm hover:shadow-md"}`}
      data-testid={`onboarding-${item.id}`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Index circle */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${acked ? "bg-green-100 text-green-600" : `${meta.bg} ${meta.color}`}`}>
          {acked ? <CheckCircle2 className="w-4 h-4" /> : index}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-snug mb-1.5 ${acked ? "line-through text-slate-400" : "text-[#1A1F2B]"}`}>
            {item.title}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {item.estimated_time && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" /> {item.estimated_time}
              </span>
            )}
            {item.link_url && (
              <Badge className={`text-xs border px-1.5 py-0 flex items-center gap-0.5 ${meta.badge}`}>
                <Globe className="w-3 h-3" /> Web Link
              </Badge>
            )}
            {roleMeta && (
              <Badge className={`text-xs border px-1.5 py-0 ${roleMeta.cls}`}>
                {roleMeta.label}
              </Badge>
            )}
            {acked && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs border px-1.5 py-0">Done</Badge>
            )}
          </div>

          {item.description && (
            <>
              <button
                className={`text-xs flex items-center gap-0.5 mb-1 ${meta.color} opacity-75 hover:opacity-100`}
                onClick={() => setExpanded(e => !e)}
                data-testid={`button-expand-${item.id}`}
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? "Hide details" : "Why this matters"}
              </button>
              {expanded && (
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{item.description}</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {item.link_url && (
            <a
              href={item.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition-colors text-slate-400 hover:${meta.bg} ${meta.color}`}
              title="Open resource"
              data-testid={`button-open-${item.id}`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!acked && (
            <button
              onClick={onAck}
              className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
              title="Mark as read"
              data-testid={`button-ack-${item.id}`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* URL strip — only for unread web links */}
      {item.link_url && !acked && (
        <div className={`mx-4 mb-3 rounded-lg ${meta.bg} border border-current border-opacity-20 px-3 py-2 flex items-center justify-between`}>
          <span className={`text-xs ${meta.color} font-medium truncate mr-2 opacity-75`}>{item.link_url}</span>
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`shrink-0 text-xs font-semibold ${meta.color} flex items-center gap-1 hover:underline`}
            data-testid={`link-open-${item.id}`}
          >
            Open <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ── Section Panel ──────────────────────────────────────────────────────────────

function SectionPanel({
  section,
  items,
  globalIndex,
  onAck,
}: {
  section: string;
  items: any[];
  globalIndex: number;
  onAck: (id: number) => void;
}) {
  const meta = SECTION_META[section as keyof typeof SECTION_META] ?? DEFAULT_META;
  const total = items.length;
  const done = items.filter(it => it.acked === true || it.acked === "true").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`rounded-2xl border-2 ${meta.ring} overflow-hidden`}>
      <button
        className={`w-full flex items-center gap-3 px-5 py-4 ${meta.bg} hover:opacity-90 transition-opacity text-left`}
        onClick={() => setCollapsed(c => !c)}
        data-testid={`section-header-${section.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center ${meta.color} shrink-0`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-sm ${meta.color}`}>{section}</p>
            {meta.week && (
              <Badge className={`text-xs border px-1.5 py-0 ${meta.badge}`}>
                <Calendar className="w-3 h-3 mr-0.5" />{meta.week}
              </Badge>
            )}
          </div>
          {meta.blurb && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{meta.blurb}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-xs font-bold ${done === total ? "text-green-600" : meta.color}`}>
              {done}/{total}
            </p>
            <div className="w-20 bg-white/60 rounded-full h-1.5 mt-1">
              <div
                className={`h-1.5 rounded-full transition-all ${done === total ? "bg-green-500" : meta.color.replace("text-", "bg-")}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3 bg-white">
          {items.map((item, i) => (
            <ReadingCard
              key={item.id}
              item={item}
              index={globalIndex + i}
              meta={meta}
              onAck={() => onAck(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────

function OnboardingContent() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    document.title = "Onboarding | handləkraft";
    load();
  }, []);

  async function load() {
    setLoading(true);
    const r = await apiRequest("GET", "/api/lms/onboarding");
    if (r.success) setItems(r.data || []);
    setLoading(false);
  }

  async function ack(id: number) {
    await apiRequest("POST", `/api/lms/onboarding/${id}/ack`);
    setItems(prev => prev.map(it => it.id === id ? { ...it, acked: true } : it));
  }

  const total = items.length;
  const done = items.filter(it => it.acked === true || it.acked === "true").length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const sections = items.reduce<Record<string, any[]>>((acc, it) => {
    const key = it.section || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(it);
    return acc;
  }, {});

  let runningIndex = 1;

  if (loading) return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-slate-100" />
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#0D7377]" /> Employee Onboarding
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ~15–18 hours of reading across six weeks — about 3 hours per week, on the clock. This is real work.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAdding(true)} className="bg-[#0D7377] hover:bg-teal-700 text-white gap-1.5 shrink-0" data-testid="button-add-item">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        )}
      </div>

      {/* Progress banner */}
      {total > 0 && (
        <div className={`rounded-2xl p-5 mb-6 ${pct === 100 ? "bg-green-50 border border-green-200" : "bg-white border border-slate-100 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {pct === 100
                ? <Sparkles className="w-5 h-5 text-green-500" />
                : <GraduationCap className="w-5 h-5 text-[#0D7377]" />
              }
              <span className="font-semibold text-sm text-[#1A1F2B]">
                {pct === 100 ? "Onboarding complete — welcome to the crew!" : "Your reading progress"}
              </span>
            </div>
            <span className={`text-sm font-bold ${pct === 100 ? "text-green-600" : "text-[#0D7377]"}`} data-testid="text-onboarding-progress">
              {done} of {total} read
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-[#0D7377]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <button
            className="mt-3 text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 transition-colors"
            onClick={() => setShowPlan(p => !p)}
            data-testid="button-toggle-plan"
          >
            <Calendar className="w-3 h-3" />
            {showPlan ? "Hide" : "Show"} suggested 6-week reading schedule
          </button>

          {showPlan && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-3 py-2 font-semibold text-slate-500 w-20">Period</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-500">Focus</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEKLY_PLAN.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-3 py-2 font-medium text-[#0D7377]">{row.week}</td>
                      <td className="px-3 py-2 text-slate-600">{row.focus}</td>
                      <td className="px-3 py-2 text-slate-400 text-right font-mono">{row.est}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-[#0D7377]/5 border-t border-slate-100 px-3 py-2">
                <p className="text-xs text-[#0D7377] font-medium">Total: ~15–18 hours over six weeks. This time is on the clock — protect it.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section panels */}
      {total === 0 ? (
        <div className="text-center py-24">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-medium">No onboarding items yet</p>
          {isAdmin && <p className="text-slate-300 text-sm mt-1">Add reading materials using the button above.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(sections).map(([section, sectionItems]) => {
            const startIndex = runningIndex;
            runningIndex += sectionItems.length;
            return (
              <SectionPanel
                key={section}
                section={section}
                items={sectionItems}
                globalIndex={startIndex}
                onAck={ack}
              />
            );
          })}
        </div>
      )}

      {adding && <AddItemModal onClose={() => setAdding(false)} onSaved={load} />}
    </div>
  );
}

export default function EmployeeOnboarding() {
  return (
    <PortalGuard allowedRoles={["admin", "employee"]}>
      <EmployeeLayout><OnboardingContent /></EmployeeLayout>
    </PortalGuard>
  );
}
