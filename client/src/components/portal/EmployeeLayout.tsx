import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Clock, Kanban, Receipt, Ticket,
  BookOpen, LogOut, Menu, X, Users, Bell
} from "lucide-react";
import logoImg from "@/assets/images/logo.png";

const navItems = [
  { href: "/portal/employee/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/employee/time", icon: <Clock className="w-4 h-4" />, label: "Time Tracking" },
  { href: "/portal/employee/kanban", icon: <Kanban className="w-4 h-4" />, label: "Kanban Boards" },
  { href: "/portal/employee/expenses", icon: <Receipt className="w-4 h-4" />, label: "Expenses" },
  { href: "/portal/employee/tickets", icon: <Ticket className="w-4 h-4" />, label: "Client Tickets" },
  { href: "/portal/employee/lms", icon: <BookOpen className="w-4 h-4" />, label: "LMS Courses" },
];

const adminItems = [
  { href: "/portal/admin/users", icon: <Users className="w-4 h-4" />, label: "Portal Users" },
];

export function EmployeeLayout({ children }: { children: React.ReactNode }) {
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
        ? "bg-[#0D7377] text-white"
        : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const adminLinkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors no-underline ${
      location === href ? "bg-[#D4A843] text-[#1A1F2B]" : "text-white/60 hover:bg-white/10 hover:text-white"
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img src={logoImg} alt="handləkraft.ai" className="w-8 h-8 rounded-lg" />
          <span className="text-white font-display text-sm">handləkraft.ai</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-white/30 text-xs font-medium px-3 py-2 uppercase tracking-wider">Employee Tools</p>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)} onClick={() => setSidebarOpen(false)}>
            {item.icon}
            {item.label}
          </Link>
        ))}

        {user?.role === "admin" && (
          <>
            <p className="text-white/30 text-xs font-medium px-3 py-2 mt-3 uppercase tracking-wider">Admin</p>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} className={adminLinkClass(item.href)} onClick={() => setSidebarOpen(false)}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-white/40 text-xs truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-white/60 hover:text-white mt-1 text-sm" onClick={handleLogout} data-testid="button-portal-logout">
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
              <button onClick={() => setSidebarOpen(false)} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
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
            <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500" data-testid="button-notifications">
              <Bell className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
              <div className="w-7 h-7 rounded-full bg-[#0D7377] flex items-center justify-center text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              {user?.firstName} {user?.lastName}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
