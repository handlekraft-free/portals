import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";

interface PortalGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

function ForcePasswordChangeModal() {
  const { user, refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
    if (newPassword === currentPassword) { setError("Your new password must be different from your current one."); return; }
    setSaving(true);
    const result = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setDone(true);
      setTimeout(() => refresh(), 1200);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm p-4 font-body">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7">
        {done ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <p className="text-[#0F172A] font-semibold text-xl">Password updated!</p>
            <p className="text-slate-500 text-sm text-center">Taking you in…</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-6 gap-2">
              <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 flex items-center justify-center mb-1">
                <KeyRound className="w-6 h-6 text-[#2563EB]" />
              </div>
              <h2 className="text-xl font-display text-[#0F172A] text-center">Set your password</h2>
              <p className="text-slate-500 text-sm text-center leading-relaxed">
                Welcome{user?.firstName ? `, ${user.firstName}` : ""}! Your account was set up with a temporary
                password. Please choose a new one to keep things secure.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-700 text-sm">Current (temporary) password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Your temporary password"
                    required
                    autoFocus
                    className="pr-10"
                    data-testid="input-current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 text-sm">New password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    className="pr-10"
                    data-testid="input-new-password"
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <p className={`text-xs mt-1 ${newPassword.length >= 12 ? "text-emerald-600" : newPassword.length >= 8 ? "text-yellow-600" : "text-red-500"}`}>
                    {newPassword.length >= 12 ? "Strong" : newPassword.length >= 8 ? "Good" : "Too short"}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-slate-700 text-sm">Confirm new password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    required
                    className="pr-10"
                    data-testid="input-confirm-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs mt-1 text-red-500">Passwords don't match yet</p>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
                  <p className="text-xs mt-1 text-emerald-600">Passwords match ✓</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg" data-testid="text-change-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={saving || newPassword !== confirmPassword || newPassword.length < 8 || !currentPassword}
                className="w-full bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-semibold py-2.5 rounded-xl mt-2"
                data-testid="button-set-password"
              >
                {saving ? "Saving…" : "Set my password & continue"}
              </Button>
            </form>

            <p className="text-center text-slate-400 text-xs mt-5">
              You must set a new password before accessing the portal.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Prefer a portal-specific role over a catch-all "admin" so that an admin who
// also has, e.g., "board" lands in the board context (and so guards behave
// consistently regardless of allowedRoles ordering).
function pickSwitchTarget(allowedRoles: string[], availableRoles: string[]): string | null {
  const eligible = allowedRoles.filter(r => availableRoles.includes(r));
  if (eligible.length === 0) return null;
  const nonAdmin = eligible.find(r => r !== "admin");
  return nonAdmin ?? eligible[0];
}

export function PortalGuard({ allowedRoles, children }: PortalGuardProps) {
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [switching, setSwitching] = useState(false);
  // One-shot guard: only ever attempt switch-portal once per (user × allowed
  // roles) mount. Prevents an indefinite retry loop if the server returns
  // a non-success response or the network call fails.
  const switchAttemptedRef = useRef<string | null>(null);

  // Multi-role users land on, e.g., /portal/board/* with their JWT still set
  // to "employee". The server's APIs key off the JWT role, so without a
  // switch the page would 403 silently. Auto-call switch-portal here so the
  // session matches the portal the user navigated to. Falls through to the
  // not-authorized redirect if the user truly lacks the role.
  useEffect(() => {
    if (loading || !user) return;
    const availableRoles: string[] = user.availableRoles ?? [user.role];
    const activeMatches = allowedRoles.includes(user.role);
    const availableMatches = availableRoles.some(r => allowedRoles.includes(r));
    if (activeMatches || !availableMatches || switching) return;
    const target = pickSwitchTarget(allowedRoles, availableRoles);
    if (!target) return;
    const attemptKey = `${user.id}:${allowedRoles.join(",")}`;
    if (switchAttemptedRef.current === attemptKey) return;
    switchAttemptedRef.current = attemptKey;
    setSwitching(true);
    fetch("/api/auth/switch-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: target }),
      credentials: "include",
    })
      .then(r => r.json())
      .then(async (data) => {
        if (data?.success) await refresh();
        // On failure, fall through to the availableRoles-based render — the
        // server-side requireRole fallback still permits access. We
        // deliberately do NOT retry; the one-shot ref prevents a loop.
      })
      .catch(() => { /* swallowed — see comment above */ })
      .finally(() => setSwitching(false));
  }, [user, loading, allowedRoles, switching, refresh]);

  useEffect(() => {
    if (loading || switching) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    const availableRoles: string[] = user.availableRoles ?? [user.role];
    const activeMatches = allowedRoles.includes(user.role);
    const availableMatches = availableRoles.some(r => allowedRoles.includes(r));
    if (!activeMatches && !availableMatches) {
      if (user.role === "client") setLocation("/portal/client/dashboard");
      else if (user.role === "student") setLocation("/portal/student/dashboard");
      else if (user.role === "board") setLocation("/portal/board/dashboard");
      else setLocation("/portal/employee/dashboard");
    }
  }, [user, loading, switching, allowedRoles, setLocation]);

  if (loading || switching) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;
  const availableRoles: string[] = user.availableRoles ?? [user.role];
  const allowed = allowedRoles.includes(user.role) || availableRoles.some(r => allowedRoles.includes(r));
  if (!allowed) return null;

  // Render portal content but overlay the force-change modal if needed
  return (
    <>
      {children}
      {user.mustChangePassword && <ForcePasswordChangeModal />}
    </>
  );
}
