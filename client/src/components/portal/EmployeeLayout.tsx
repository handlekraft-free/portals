import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Clock, Kanban, Receipt, Ticket,
  BookOpen, LogOut, Menu, X, Users, UserPlus,
  ArrowRight, MessageSquare, GraduationCap, Settings,
} from "lucide-react";
import { GoogleNotificationBell } from "@/components/portal/GoogleNotificationBell";
import { FloatingTimer } from "@/components/portal/FloatingTimer";
import { PortalSwitcher } from "@/components/portal/PortalSwitcher";
import { apiRequest } from "@/lib/auth";
import logoImg from "@/assets/images/logo.png";
import {
  VikingCrossedSwords, VikingShieldSvg, RuneDivider,
  LongshipWatermark, VikingMotto, LongshipBackground, PageViking,
} from "@/components/portal/VikingDecor";

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
          color="bg-[#0D7377] text-white"
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
          color="bg-[#0D7377]/80 text-white"
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
        ? "bg-[#0D7377] text-white"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const adminLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      location === href ? "bg-[#D4A843] text-[#1A1F2B]" : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  // ── Sidebar content ───────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none select-none" aria-hidden="true">
        <LongshipWatermark />
      </div>

      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src={logoImg} alt="handləkraft.ai" className="w-8 h-8 rounded-lg" />
          <span className="text-white font-display text-sm">handləkraft.ai</span>
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

      <div className="p-3 border-t border-white/10 relative z-10">
        <VikingMotto type="employee" />
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-white/40 text-xs truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white/60 hover:text-white mt-1 text-sm"
          onClick={handleLogout}
          data-testid="button-portal-logout"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex font-body">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-[#1A1F2B] flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#1A1F2B] flex flex-col">
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
          <div className="md:hidden font-display text-[#1A1F2B] text-sm">handləkraft.ai</div>
          <div className="flex items-center gap-2 ml-auto">
            <PortalSwitcher variant="light" />
            <GoogleNotificationBell />
            <div
              className="w-7 h-7 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold"
              title={`${user?.firstName} ${user?.lastName}`}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-16 relative overflow-hidden">
          <LongshipBackground />
          <div className="relative z-10">{children}</div>
        </main>
        <PageViking />
        <FloatingTimer />
      </div>
    </div>
  );
}
