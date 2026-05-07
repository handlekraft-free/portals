import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Users, Scale, Mail, Clock, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BOARD_KNOWLEDGE_AREAS } from "@/components/portal/BoardExpertiseRater";
import { BRAND } from "@shared/branding";

// ── helpers ────────────────────────────────────────────────────────────────

function fmtLastLogin(raw: string | null | undefined): { label: string; color: string } {
  if (!raw) return { label: "Never logged in", color: "text-slate-300" };
  const date = new Date(raw);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2)   return { label: "Just now",                    color: "text-green-600" };
  if (mins < 60)  return { label: `${mins}m ago`,                color: "text-green-600" };
  if (hrs < 24)   return { label: `${hrs}h ago`,                 color: "text-green-500" };
  if (days === 1) return { label: "Yesterday",                   color: "text-teal-600" };
  if (days < 7)   return { label: `${days}d ago`,                color: "text-teal-600" };
  if (days < 30)  return { label: `${Math.floor(days/7)}w ago`,  color: "text-slate-500" };
  return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), color: "text-slate-400" };
}

const LEVEL_SCORE: Record<string, number> = { none: 0, novice: 1, moderate: 2, heavy: 3, expert: 4 };

function scoreColor(pct: number): { bar: string; label: string; text: string } {
  if (pct === 0)   return { bar: "bg-slate-200",   label: "Gap",        text: "text-slate-400" };
  if (pct < 0.25)  return { bar: "bg-red-400",     label: "Weak",       text: "text-red-600" };
  if (pct < 0.50)  return { bar: "bg-orange-400",  label: "Developing", text: "text-orange-600" };
  if (pct < 0.75)  return { bar: "bg-amber-400",   label: "Moderate",   text: "text-amber-700" };
  if (pct < 0.90)  return { bar: "bg-teal-500",    label: "Strong",     text: "text-teal-700" };
  return              { bar: "bg-emerald-500",  label: "Excellent",  text: "text-emerald-700" };
}

// ── Composite Table ────────────────────────────────────────────────────────

function CompositeExpertiseTable({ members }: { members: any[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState<"tier" | "score">("score");

  const eligibleMembers = members.filter(m => m.status !== "inactive" && m.boardExpertise && Object.keys(m.boardExpertise).length > 0);
  const totalMembers = eligibleMembers.length;

  if (totalMembers === 0) return null;

  const rows = BOARD_KNOWLEDGE_AREAS.map(area => {
    let totalScore = 0;
    let ratedCount = 0;
    for (const m of eligibleMembers) {
      const level = m.boardExpertise?.[area.key];
      if (level && level !== "none" && level !== undefined) {
        totalScore += LEVEL_SCORE[level] ?? 0;
        ratedCount++;
      }
    }
    const maxScore = totalMembers * 4;
    const pct = maxScore > 0 ? totalScore / maxScore : 0;
    return { ...area, totalScore, maxScore, pct, ratedCount };
  });

  const sorted = sortBy === "score"
    ? [...rows].sort((a, b) => a.pct - b.pct)
    : [...rows].sort((a, b) => a.tier - b.tier || a.pct - b.pct);

  const overallPct = rows.reduce((s, r) => s + r.pct, 0) / rows.length;
  const gaps = rows.filter(r => r.pct < 0.25).length;
  const strong = rows.filter(r => r.pct >= 0.75).length;

  const tiers = [1, 2, 3, 4, 5];

  return (
    <Card className="border border-slate-200 shadow-sm mt-8" data-testid="card-composite-expertise">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            <div>
              <CardTitle className="text-base text-[#0F172A]">Composite Board Expertise</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Aggregate self-ratings across {totalMembers} active board member{totalMembers !== 1 ? "s" : ""} with profiles</p>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            data-testid="button-toggle-composite"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Overall</p>
            <p className="text-sm font-bold text-[#0F172A]">{Math.round(overallPct * 100)}%</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-1.5 text-center">
            <p className="text-[10px] text-red-400 uppercase tracking-wider">Gaps</p>
            <p className="text-sm font-bold text-red-600">{gaps}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-center">
            <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Strong</p>
            <p className="text-sm font-bold text-emerald-700">{strong}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            Sort:
            <button
              onClick={() => setSortBy("score")}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${sortBy === "score" ? "bg-indigo-100 text-indigo-700 font-medium" : "hover:bg-slate-100"}`}
              data-testid="button-sort-score"
            >
              By score
            </button>
            <button
              onClick={() => setSortBy("tier")}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${sortBy === "tier" ? "bg-indigo-100 text-indigo-700 font-medium" : "hover:bg-slate-100"}`}
              data-testid="button-sort-tier"
            >
              By tier
            </button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0">
          {sortBy === "tier" ? (
            // Grouped by tier view
            <div className="space-y-5">
              {tiers.map(tier => {
                const tierRows = sorted.filter(r => r.tier === tier);
                if (tierRows.length === 0) return null;
                const tierLabel = tierRows[0].tierLabel;
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Tier {tier} — {tierLabel}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <div className="space-y-2">
                      {tierRows.map(row => <ExpertiseRow key={row.key} row={row} totalMembers={totalMembers} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Flat sorted view (weakest first)
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-3">Sorted weakest → strongest — focus recruitment on the top gaps</p>
              {sorted.map(row => <ExpertiseRow key={row.key} row={row} totalMembers={totalMembers} showTier />)}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ExpertiseRow({ row, totalMembers, showTier = false }: { row: any; totalMembers: number; showTier?: boolean }) {
  const colors = scoreColor(row.pct);
  const pctDisplay = Math.round(row.pct * 100);

  return (
    <div className="flex items-center gap-3 group" data-testid={`composite-row-${row.key}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-sm text-[#0F172A] truncate leading-snug">{row.label}</p>
          {showTier && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-slate-300 border border-slate-200 rounded px-1">
              T{row.tier}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${pctDisplay}%` }}
            />
          </div>
          <span className={`text-xs font-semibold w-8 text-right shrink-0 ${colors.text}`}>
            {pctDisplay}%
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right w-20">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
          row.pct === 0       ? "bg-slate-100 text-slate-400 border-slate-200" :
          row.pct < 0.25      ? "bg-red-50 text-red-600 border-red-200" :
          row.pct < 0.50      ? "bg-orange-50 text-orange-600 border-orange-200" :
          row.pct < 0.75      ? "bg-amber-50 text-amber-700 border-amber-200" :
          row.pct < 0.90      ? "bg-teal-50 text-teal-700 border-teal-200" :
                                "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {colors.label}
        </span>
        <p className="text-[10px] text-slate-300 mt-0.5">{row.ratedCount}/{totalMembers} rated</p>
      </div>
    </div>
  );
}

// ── Member cards ───────────────────────────────────────────────────────────

function MembersContent() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Board Members | ${BRAND.fullName}`;
    apiRequest("GET", "/api/board/members").then(r => {
      if (r.success) setMembers(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
      </div>
      <div className="h-64 bg-white rounded-xl animate-pulse mt-8" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[#0F172A]">Board Members</h1>
        <p className="text-slate-500 text-sm mt-0.5">{BRAND.name} Digital Board of Directors</p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No board members found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map(m => {
              const login = fmtLastLogin(m.lastLogin);
              return (
                <Card key={m.id} className="border-0 shadow-sm" data-testid={`member-${m.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-bold text-lg">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#0F172A]">{m.firstName} {m.lastName}</p>
                          {m.role === "admin" && <Badge className="bg-purple-100 text-purple-700 text-xs">Staff</Badge>}
                          {m.status === "inactive" && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        {m.boardPosition && (
                          <p className="text-sm text-indigo-600 flex items-center gap-1 mt-0.5">
                            <Scale className="w-3.5 h-3.5" />{m.boardPosition}
                          </p>
                        )}
                        <a href={`mailto:${m.email}`} className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-600 mt-0.5 no-underline">
                          <Mail className="w-3 h-3" />{m.email}
                        </a>
                        {(m.termStart || m.termEnd) && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Term: {m.termStart ? new Date(m.termStart).getFullYear() : "?"} – {m.termEnd ? new Date(m.termEnd).getFullYear() : "Present"}
                          </p>
                        )}
                        <p className={`text-xs flex items-center gap-1 mt-0.5 ${login.color}`} data-testid={`last-login-${m.id}`}>
                          <Clock className="w-3 h-3" /> Last login: {login.label}
                        </p>
                        {m.isInterestedDirector && <Badge className="bg-amber-100 text-amber-700 text-xs mt-1">Interested Director</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <CompositeExpertiseTable members={members} />
        </>
      )}
    </div>
  );
}

export default function BoardMembers() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><MembersContent /></BoardLayout>
    </PortalGuard>
  );
}
