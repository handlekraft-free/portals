import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ChevronDown, Briefcase, Building2, GraduationCap, Shield } from "lucide-react";
import { getPortalPath } from "@/lib/auth";

const PORTAL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin:    { label: "Team Portal",          icon: <Briefcase className="w-3.5 h-3.5" />,     color: "#2563EB" },
  employee: { label: "Workforce Portal",     icon: <Briefcase className="w-3.5 h-3.5" />,     color: "#2563EB" },
  client:   { label: "Client CRM",           icon: <Building2 className="w-3.5 h-3.5" />,     color: "#10B981" },
  student:  { label: "Student LMS",          icon: <GraduationCap className="w-3.5 h-3.5" />, color: "#7C3AED" },
  board:    { label: "Board Member Portal",  icon: <Shield className="w-3.5 h-3.5" />,        color: "#4F46E5" },
};

interface PortalSwitcherProps {
  variant?: "light" | "dark";
}

export function PortalSwitcher({ variant = "dark" }: PortalSwitcherProps) {
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const availableRoles: string[] = user?.availableRoles ?? (user?.role ? [user.role] : []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (availableRoles.length <= 1) return null;

  const currentMeta = PORTAL_META[user?.role ?? "employee"];
  const otherRoles = availableRoles.filter(r => r !== user?.role);

  async function switchTo(role: string) {
    if (switching) return;
    setSwitching(true);
    setOpen(false);
    try {
      const res = await fetch("/api/auth/switch-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
        window.location.href = getPortalPath(role);
      }
    } finally {
      setSwitching(false);
    }
  }

  const isLight = variant === "light";

  const btnClass = isLight
    ? "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-colors border border-white/20";

  const dropdownClass = isLight
    ? "absolute right-0 top-full mt-1.5 min-w-[168px] bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden py-1"
    : "absolute right-0 top-full mt-1.5 min-w-[168px] bg-[#252B3A] border border-white/10 rounded-xl shadow-lg z-[100] overflow-hidden py-1";

  const labelClass = isLight
    ? "px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400"
    : "px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-white/30";

  const itemClass = isLight
    ? "flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
    : "flex items-center gap-2.5 w-full px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors";

  return (
    <div className="relative" ref={ref}>
      <button
        className={btnClass}
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        data-testid="button-portal-switcher"
        title="Switch portal"
      >
        <span style={{ color: currentMeta?.color }}>{currentMeta?.icon}</span>
        <span className="hidden sm:inline max-w-[90px] truncate">
          {switching ? "Switching…" : (currentMeta?.label ?? "Portal")}
        </span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={dropdownClass}>
          <p className={labelClass}>Switch to</p>
          {otherRoles.map(role => {
            const meta = PORTAL_META[role];
            if (!meta) return null;
            return (
              <button
                key={role}
                className={itemClass}
                onClick={() => switchTo(role)}
                data-testid={`button-switch-portal-${role}`}
              >
                <span style={{ color: meta.color }}>{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
