import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, CalendarDays, FileText, ScrollText, CheckSquare,
  Scale, LogOut, Menu, X, Bell, Users, FileSignature,
} from "lucide-react";
import logoImg from "@/assets/images/logo.png";

const navItems = [
  { href: "/portal/board/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/board/meetings", icon: <CalendarDays className="w-4 h-4" />, label: "Meetings" },
  { href: "/portal/board/documents", icon: <FileText className="w-4 h-4" />, label: "Documents" },
  { href: "/portal/board/minutes", icon: <ScrollText className="w-4 h-4" />, label: "Minutes" },
  { href: "/portal/board/action-items", icon: <CheckSquare className="w-4 h-4" />, label: "Action Items" },
  { href: "/portal/board/consents", icon: <FileSignature className="w-4 h-4" />, label: "Written Consents" },
  { href: "/portal/board/members", icon: <Users className="w-4 h-4" />, label: "Board Members" },
];

export function BoardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const navLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      location === href || location.startsWith(href + "/")
        ? "bg-indigo-500 text-white"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src={logoImg} alt="handləkraft.ai" className="w-8 h-8 rounded-lg" />
          <div>
            <p className="text-white font-semibold text-sm leading-none">handləkraft</p>
            <p className="text-indigo-300 text-xs mt-0.5">Board Portal</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)} onClick={() => setSidebarOpen(false)}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-indigo-300 text-xs truncate capitalize">{user?.role === "board" ? "Board Member" : user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-white/60 hover:text-white hover:bg-white/10 gap-2 justify-start text-xs" data-testid="button-logout">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F3EF]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-[#1A1F2B] z-50 flex flex-col transition-transform duration-200 md:relative md:translate-x-0 md:flex ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden bg-[#1A1F2B] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 hover:text-white" data-testid="button-open-sidebar">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-white font-semibold text-sm flex-1">Board Portal</p>
          <Scale className="w-5 h-5 text-indigo-400" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
