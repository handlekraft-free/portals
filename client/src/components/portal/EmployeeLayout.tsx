import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Clock, Kanban, Receipt, Ticket,
  BookOpen, LogOut, Menu, X, Users, UserPlus,
  ArrowRight, MessageSquare, GraduationCap, Settings,
  Lightbulb, Send, ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GoogleNotificationBell } from "@/components/portal/GoogleNotificationBell";
import { FloatingTimer } from "@/components/portal/FloatingTimer";
import { PortalSwitcher } from "@/components/portal/PortalSwitcher";
import { apiRequest } from "@/lib/auth";
import { BRAND } from "@shared/branding";
import logoImg from "@/assets/images/logo.png";
import {
  VikingCrossedSwords, VikingShieldSvg, RuneDivider,
  LongshipWatermark, VikingMotto, LongshipBackground, PageViking,
} from "@/components/portal/VikingDecor";
import { XpProvider } from "@/components/portal/XpProvider";
import { HeroCard } from "@/components/portal/HeroCard";
import { CrewBondToaster } from "@/components/portal/CrewBondToaster";
import { SagaRecapModal } from "@/components/portal/SagaRecapModal";
import { AvatarRenderer, type AvatarConfig } from "@/components/portal/AvatarRenderer";

// Top-bar avatar that reuses the same SVG renderer as the HeroCard so the
// avatar is consistent across the portal (sidebar header, hero card, modal).
function SidebarHeroAvatar({ initials, fullName }: { initials: string; fullName: string }) {
  const [cfg, setCfg] = useState<AvatarConfig | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiRequest("GET", "/api/auth/me").then((res) => {
      if (!cancelled && res?.success && res.data?.avatarConfig) {
        setCfg(res.data.avatarConfig as AvatarConfig);
      }
    }).catch(() => {});
    // Live sync: any surface that saves the avatar fires `hk:avatar-changed`.
    const onChanged = (e: Event) => {
      const c = (e as CustomEvent<{ config: AvatarConfig }>).detail?.config;
      if (c) setCfg(c);
    };
    window.addEventListener("hk:avatar-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("hk:avatar-changed", onChanged);
    };
  }, []);
  return (
    <div title={fullName} data-testid="avatar-sidebar">
      <AvatarRenderer initials={initials} config={cfg} size={28} />
    </div>
  );
}

// ── Brain Dump ────────────────────────────────────────────────────────────────
// Floating capture button — bottom-left. Thought → Kanban card in one shot.

function BrainDump() {
  const { toast } = useToast();
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [boards, setBoards]   = useState<Array<{ id: number; name: string; columns: Array<{ id: number; title: string }> }>>([]);
  const [boardId, setBoardId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch boards (with columns) lazily when the modal opens
  useEffect(() => {
    if (!open) return;
    apiRequest("GET", "/api/kanban/boards").then(async res => {
      if (res.success && res.data?.length) {
        const firstId = res.data[0].id;
        // Fetch full detail for first board to get columns
        const detail = await apiRequest("GET", `/api/kanban/boards/${firstId}`);
        const fullBoards = [detail.data, ...res.data.slice(1)].filter(Boolean);
        setBoards(fullBoards);
        if (!boardId) setBoardId(firstId);
      }
    });
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  async function capture() {
    if (!text.trim() || !boardId) return;
    setSaving(true);
    const board = boards.find(b => b.id === boardId);
    const colId = board?.columns?.[0]?.id;
    if (!colId) { setSaving(false); return; }
    const res = await apiRequest("POST", "/api/kanban/cards", {
      title: text.trim(),
      boardId,
      columnId: colId,
      priority: "medium",
    });
    setSaving(false);
    if (res.success) {
      toast({ title: "Captured!", description: `Added to ${board?.name ?? "board"}` });
      setText("");
      setOpen(false);
    } else {
      toast({ title: "Couldn't save", description: "Try again", variant: "destructive" });
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); capture(); }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Brain Dump — capture a thought"
        data-testid="button-brain-dump"
        className="fixed bottom-4 left-4 z-20 w-11 h-11 rounded-full bg-[#0F172A] hover:bg-[#2563EB] text-white shadow-lg flex items-center justify-center transition-colors duration-200 group"
      >
        <Lightbulb className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>

      {/* Mini modal */}
      {open && (
        <>
          <div className="fixed inset-0 z-[45]" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-16 left-4 z-[46] bg-white rounded-2xl shadow-2xl border border-slate-100 w-72 p-4"
            onClick={e => e.stopPropagation()}
            data-testid="modal-brain-dump"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm font-semibold text-[#0F172A]">Brain Dump</p>
              <p className="text-xs text-slate-400 ml-auto">Enter to save</p>
            </div>

            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 placeholder:text-slate-300"
              data-testid="input-brain-dump"
            />

            {boards.length > 1 && (
              <div className="relative mt-2">
                <select
                  value={boardId ?? ""}
                  onChange={e => setBoardId(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 text-slate-600 bg-slate-50"
                  data-testid="select-brain-dump-board"
                >
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            )}

            <button
              onClick={capture}
              disabled={!text.trim() || saving}
              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-40 text-white text-sm font-medium rounded-xl py-2 transition-colors"
              data-testid="button-brain-dump-save"
            >
              <Send className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Capture it"}
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ── Nav counts type ───────────────────────────────────────────────────────────

type NavCounts = {
  dmUnread: number;
  clientMsgUnread: number;
  overdueTaskCount: number;
  openTicketCount: number;
  timesheetDue: boolean;
};

// ── Sidebar badge components ──────────────────────────────────────────────────

function CountBadge({ count, color, pulse = false, title }: {
  count: number; color: string; pulse?: boolean; title?: string;
}) {
  return (
    <span
      title={title}
      className={`
        inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem]
        rounded-full text-[10px] font-bold leading-none px-1
        ${color} ${pulse ? "animate-pulse" : ""}
      `}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function DotBadge({ color, pulse = false, title }: {
  color: string; pulse?: boolean; title?: string;
}) {
  return (
    <span
      title={title}
      className={`w-2 h-2 rounded-full shrink-0 ${color} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

// ── Nav items definition ──────────────────────────────────────────────────────

const navItems = [
  { href: "/portal/employee/dashboard",  icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/employee/onboarding", icon: <GraduationCap className="w-4 h-4" />,  label: "Onboarding" },
  { href: "/portal/employee/time",       icon: <Clock className="w-4 h-4" />,           label: "Time Tracking" },
  { href: "/portal/employee/kanban",     icon: <Kanban className="w-4 h-4" />,          label: "Kanban Boards" },
  { href: "/portal/employee/expenses",   icon: <Receipt className="w-4 h-4" />,         label: "Expenses" },
  { href: "/portal/employee/tickets",    icon: <Ticket className="w-4 h-4" />,          label: "Client Tickets" },
  { href: "/portal/employee/lms",        icon: <BookOpen className="w-4 h-4" />,        label: "LMS Courses" },
  { href: "/portal/employee/chat",       icon: <MessageSquare className="w-4 h-4" />,   label: "Communication" },
  { href: "/portal/employee/settings",   icon: <Settings className="w-4 h-4" />,        label: "Settings" },
];

const adminItems = [
  { href: "/portal/admin/users", icon: <UserPlus className="w-4 h-4" />, label: "Manage Users" },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navCounts, setNavCounts] = useState<NavCounts | null>(null);

  useEffect(() => {
    function fetchCounts() {
      apiRequest("GET", "/api/auth/nav-counts")
        .then(res => { if (res.success) setNavCounts(res.data); })
        .catch(() => {});
    }
    fetchCounts();
    const id = setInterval(fetchCounts, 45_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  // ── Badge renderer ────────────────────────────────────────────────────────

  function navBadge(href: string) {
    if (!navCounts) return null;

    if (href.includes("/chat")) {
      const total = navCounts.dmUnread + navCounts.clientMsgUnread;
      if (total === 0) return null;
      return (
        <CountBadge
          count={total}
          color="bg-[#2563EB] text-white"
          pulse={navCounts.dmUnread > 0}
          title={
            navCounts.dmUnread > 0
              ? `${navCounts.dmUnread} unread direct message${navCounts.dmUnread !== 1 ? "s" : ""}`
              : `${navCounts.clientMsgUnread} unread client message${navCounts.clientMsgUnread !== 1 ? "s" : ""}`
          }
        />
      );
    }

    if (href.includes("/tickets")) {
      if (navCounts.openTicketCount === 0) return null;
      return (
        <CountBadge
          count={navCounts.openTicketCount}
          color="bg-[#2563EB]/80 text-white"
          title={`${navCounts.openTicketCount} open ticket${navCounts.openTicketCount !== 1 ? "s" : ""}`}
        />
      );
    }

    if (href.includes("/kanban")) {
      if (navCounts.overdueTaskCount === 0) return null;
      return (
        <CountBadge
          count={navCounts.overdueTaskCount}
          color="bg-amber-500 text-white"
          title={`${navCounts.overdueTaskCount} overdue task${navCounts.overdueTaskCount !== 1 ? "s" : ""}`}
        />
      );
    }

    if (href.includes("/time")) {
      if (!navCounts.timesheetDue) return null;
      return (
        <DotBadge
          color="bg-amber-400"
          title="Last month's timesheet is waiting"
        />
      );
    }

    return null;
  }

  // ── Link class ────────────────────────────────────────────────────────────

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      location === href || location.startsWith(href + "/")
        ? "bg-[#2563EB] text-white"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const adminLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      location === href ? "bg-[#10B981] text-[#0F172A]" : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  // ── Sidebar content ───────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none select-none" aria-hidden="true">
        <LongshipWatermark />
      </div>

      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src={logoImg} alt={BRAND.fullName} className="w-8 h-8 rounded-lg" />
          <span className="text-white font-display text-sm">{BRAND.fullName}</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
        <p className="text-white/30 text-xs font-medium px-3 py-2 uppercase tracking-wider flex items-center gap-2">
          <VikingCrossedSwords size={13} className="text-white/25" />
          Battle Stations
        </p>
        {navItems.map(item => {
          const badge = navBadge(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.href)}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span className="flex-1 leading-none">{item.label}</span>
              {badge}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <div className="px-3 pt-3 pb-1">
              <RuneDivider className="text-white/60" />
            </div>
            <p className="text-white/30 text-xs font-medium px-3 py-1 uppercase tracking-wider flex items-center gap-2">
              <VikingShieldSvg size={12} className="text-white/25" />
              Admin
            </p>
            {adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={adminLinkClass(item.href)}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10 relative z-10 space-y-2">
        <VikingMotto type="employee" />
        <HeroCard />
        <Button
          variant="ghost"
          className="w-full justify-start text-white/60 hover:text-white text-sm"
          onClick={handleLogout}
          data-testid="button-portal-logout"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <XpProvider>
    <div className="min-h-screen bg-[#f8fafc] flex font-body">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-[#0F172A] flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#0F172A] flex flex-col">
            <div className="absolute top-3 right-3">
              <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button className="md:hidden text-slate-600 hover:text-slate-800" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="md:hidden font-display text-[#0F172A] text-sm">{BRAND.fullName}</div>
          <div className="flex items-center gap-2 ml-auto">
            <PortalSwitcher variant="light" />
            <GoogleNotificationBell />
            <SidebarHeroAvatar
              initials={`${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`}
              fullName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
            />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-16 relative overflow-hidden">
          <LongshipBackground />
          <div className="relative z-10">{children}</div>
        </main>
        <PageViking />
        <FloatingTimer />
        <BrainDump />
        <CrewBondToaster />
        <SagaRecapModal />
      </div>
    </div>
    </XpProvider>
  );
}
