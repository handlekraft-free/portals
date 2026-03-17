import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, FolderOpen, Megaphone, LogOut, Menu, X } from "lucide-react";
import logoImg from "@/assets/images/logo.png";

const navItems = [
  { href: "/portal/student/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
  { href: "/portal/student/courses", icon: <BookOpen className="w-4 h-4" />, label: "My Courses" },
  { href: "/portal/student/files", icon: <FolderOpen className="w-4 h-4" />, label: "Files" },
  { href: "/portal/student/announcements", icon: <Megaphone className="w-4 h-4" />, label: "Announcements" },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
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
        ? "bg-white/20 text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  const mobileLinkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline ${
      location === href ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#f5f3ef] font-body">
      <header className="bg-gradient-to-r from-[#1A1F2B] to-[#0D7377]/80 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src={logoImg} alt="handləkraft.ai" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-sm hidden sm:block text-white">
              handləkraft.ai <span className="text-white/40 text-xs font-body">| Fellow Portal</span>
            </span>
          </Link>

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
              <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="text-sm text-white/70">{user?.firstName}</span>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white" onClick={handleLogout} data-testid="button-portal-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            <button className="md:hidden text-white/70" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

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
