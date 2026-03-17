import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FolderOpen, MessageSquare, Ticket, LogOut, Menu, X } from "lucide-react";
import logoImg from "@/assets/images/logo.png";

const navItems = [
  { href: "/portal/client/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/client/files", icon: <FolderOpen className="w-4 h-4" />, label: "Files" },
  { href: "/portal/client/messages", icon: <MessageSquare className="w-4 h-4" />, label: "Messages" },
  { href: "/portal/client/tickets", icon: <Ticket className="w-4 h-4" />, label: "Support Tickets" },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const linkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors no-underline ${
      location === href || location.startsWith(href + "/")
        ? "bg-[#0D7377] text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const mobileLinkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline ${
      location === href ? "bg-[#0D7377] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#f5f3ef] font-body">
      <header className="bg-[#1A1F2B] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src={logoImg} alt="handləkraft.ai" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-sm hidden sm:block text-white">handləkraft.ai</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#D4A843] flex items-center justify-center text-[#1A1F2B] text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm text-white/70">{user?.firstName} {user?.lastName}</span>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white" onClick={handleLogout} data-testid="button-portal-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-2 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} className={mobileLinkClass(item.href)} onClick={() => setMobileOpen(false)}>
                {item.icon} {item.label}
              </Link>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white w-full">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
