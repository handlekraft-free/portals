import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, CalendarDays, FileText, ScrollText, CheckSquare,
  FileSignature, LogOut, Menu, Users, Scale, DollarSign, Settings, Shield,
  BookOpen, MessageSquare, Calendar, Bell, X, Check, UserCircle, CalendarClock, Newspaper,
} from "lucide-react";
import { PortalSwitcher } from "@/components/portal/PortalSwitcher";
import logoImg from "@/assets/images/logo.png";
import { BRAND } from "@shared/branding";
import BoardOnboardingWizard from "@/components/portal/BoardOnboardingWizard";
import {
  VikingHelmSvg, VikingShieldSvg, RuneDivider,
  LongshipWatermark, VikingMotto, LongshipBackground, PageViking,
} from "@/components/portal/VikingDecor";

// ── Brand tokens ──────────────────────────────────────────────────────────────
// Board portal: espresso sidebar + gold accents + parchment background
const SIDEBAR_BG   = "#1C1810";
const ACCENT       = "#D4A843";
const ACCENT_DARK  = "#b8922e";

const navItems = [
  { href: "/portal/board/dashboard",   icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/board/calendar",    icon: <Calendar className="w-4 h-4" />,        label: "Calendar" },
  { href: "/portal/board/meetings",    icon: <CalendarDays className="w-4 h-4" />,    label: "Meetings" },
  { href: "/portal/board/scheduling",  icon: <CalendarClock className="w-4 h-4" />,   label: "Schedule Coordinator" },
  { href: "/portal/board/documents",   icon: <FileText className="w-4 h-4" />,        label: "Documents" },
  { href: "/portal/board/minutes",     icon: <ScrollText className="w-4 h-4" />,      label: "Minutes" },
  { href: "/portal/board/action-items",icon: <CheckSquare className="w-4 h-4" />,     label: "Action Items" },
  { href: "/portal/board/consents",    icon: <FileSignature className="w-4 h-4" />,   label: "Written Consents" },
  { href: "/portal/board/conflicts",   icon: <Scale className="w-4 h-4" />,           label: "Conflicts of Interest" },
  { href: "/portal/board/directory",   icon: <Users className="w-4 h-4" />,           label: "Directory" },
  { href: "/portal/board/financials",  icon: <DollarSign className="w-4 h-4" />,      label: "Financials" },
  { href: "/portal/board/chat",        icon: <MessageSquare className="w-4 h-4" />,   label: "Communication" },
  { href: "/portal/board/forums",      icon: <Newspaper className="w-4 h-4" />,       label: "Forums" },
  { href: "/portal/board/onboarding",  icon: <BookOpen className="w-4 h-4" />,        label: "Onboarding" },
  { href: "/portal/board/settings",    icon: <Settings className="w-4 h-4" />,        label: "Board Settings" },
  { href: "/portal/board/profile",     icon: <UserCircle className="w-4 h-4" />,      label: "My Profile" },
];

const adminItems = [
  { href: "/portal/board/roster",  icon: <Shield className="w-4 h-4" />, label: "Manage Roster" },
  { href: "/portal/board/members", icon: <Users className="w-4 h-4" />,  label: "Board Members" },
];

interface BoardNotification {
  id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<BoardNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    const r = await apiRequest("GET", "/api/board/notifications/unread-count");
    if (r.success) setCount(r.data?.count ?? 0);
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function openDropdown() {
    if (!open) {
      setOpen(true);
      setLoading(true);
      const r = await apiRequest("GET", "/api/board/notifications");
      if (r.success) setNotifications(r.data || []);
      setLoading(false);
    } else {
      setOpen(false);
    }
  }

  async function markAllRead() {
    await apiRequest("POST", "/api/board/notifications/read", {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  }

  function fmtTime(d: string) {
    const date = new Date(d);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const h = Math.floor(diffMins / 60);
    if (h < 24) return `${h}h ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={openDropdown}
        className="relative p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        data-testid="button-notification-bell"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold" data-testid="badge-notification-count">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white rounded-xl shadow-xl border border-amber-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
            <p className="text-sm font-semibold text-[#1C1810]">Notifications</p>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-amber-50"
                  data-testid="button-mark-all-read"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400" data-testid="button-close-notifications">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-amber-50 rounded-lg animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-slate-50 last:border-0 ${!n.read ? "bg-amber-50/60" : ""}`}
                  data-testid={`notification-${n.id}`}
                >
                  <p className={`text-xs ${!n.read ? "font-medium text-[#1C1810]" : "text-slate-600"}`}>{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtTime(n.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BoardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showWizard, setShowWizard] = useState(
    () => user?.role === "board" && user?.onboardingComplete === false
  );

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      isActive(href)
        ? "text-[#1C1810] font-semibold"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const adminLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      isActive(href)
        ? "bg-white/20 text-white font-semibold"
        : "text-white/50 hover:bg-white/10 hover:text-white/80"
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: SIDEBAR_BG }}>
      <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none select-none" aria-hidden="true">
        <LongshipWatermark />
      </div>

      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src={logoImg} alt={BRAND.fullName} className="w-8 h-8 rounded-lg" />
          <div>
            <p className="text-white font-semibold text-sm leading-none">{BRAND.name}</p>
            <p className="text-xs mt-0.5" style={{ color: ACCENT }}>Board Portal</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
        <p className="text-white/30 text-xs font-medium px-3 py-2 uppercase tracking-wider flex items-center gap-2">
          <VikingHelmSvg size={14} className="text-white/25" />
          Council of the North
        </p>
        {navItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.href)}
              style={active ? { background: ACCENT } : undefined}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {(user?.role === "admin" || user?.role === "board") && (
          <>
            <div className="px-3 pt-3 pb-1">
              <RuneDivider className="text-white/60" />
            </div>
            <p className="text-white/30 text-xs font-medium px-3 py-1 uppercase tracking-wider flex items-center gap-2">
              <VikingShieldSvg size={12} className="text-white/25" />
              Board Admin
            </p>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} className={adminLinkClass(item.href)} onClick={() => setSidebarOpen(false)}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10 relative z-10">
        <VikingMotto type="board" />
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: ACCENT, color: SIDEBAR_BG }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs truncate" style={{ color: ACCENT }}>{user?.role === "board" ? "Board Member" : "Admin"}</p>
          </div>
          <div className="flex items-center gap-1">
            <PortalSwitcher variant="dark" />
            <NotificationBell />
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={handleLogout}
          className="w-full text-white/60 hover:text-white hover:bg-white/10 gap-2 justify-start text-xs"
          data-testid="button-logout"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {showWizard && (
        <BoardOnboardingWizard onComplete={() => { setShowWizard(false); setLocation("/portal/board/dashboard"); }} />
      )}
      <div className="min-h-screen flex" style={{ background: "#faf7f0" }}>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed top-0 left-0 h-full w-56 z-50 flex flex-col transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
          style={{ background: SIDEBAR_BG }}>
          <SidebarContent />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden px-4 py-3 flex items-center gap-3 sticky top-0 z-30" style={{ background: SIDEBAR_BG }}>
            <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white" data-testid="button-open-sidebar">
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-white font-semibold text-sm flex-1">Board Portal</p>
            <PortalSwitcher variant="dark" />
            <NotificationBell />
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto relative">
            <LongshipBackground />
            <div className="relative z-10">{children}</div>
          </main>
          <PageViking />
        </div>
      </div>
    </>
  );
}
