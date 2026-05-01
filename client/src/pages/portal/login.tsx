import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { login, selectRole, getPortalPath, changePassword } from "@/lib/auth";
import type { PortalUser, RoleSelectionRequired } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, GraduationCap, Eye, EyeOff, ArrowLeft, Shield, Scale, KeyRound, CheckCircle2, Users } from "lucide-react";
import logoImg from "@/assets/images/logo.png";

type Role = "employee" | "client" | "student" | "board" | "admin";

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  employee: { label: "Team Member", icon: <Briefcase className="w-6 h-6" />, desc: "Employees & Staff", color: "border-[#0D7377] bg-[#0D7377]/10 text-[#0D7377]" },
  client:   { label: "Client",      icon: <Building2 className="w-6 h-6" />, desc: "Organizations we serve", color: "border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]" },
  student:  { label: "Student",     icon: <GraduationCap className="w-6 h-6" />, desc: "Fellowship Fellows", color: "border-purple-500 bg-purple-500/10 text-purple-600" },
  board:    { label: "Board Member",icon: <Scale className="w-6 h-6" />, desc: "Board of Directors", color: "border-indigo-400 bg-indigo-500/10 text-indigo-400" },
  admin:    { label: "Admin",       icon: <Shield className="w-6 h-6" />, desc: "Full system access", color: "border-red-400 bg-red-500/10 text-red-400" },
};

const hintRoles: { id: Role; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: "employee", ...ROLE_META.employee },
  { id: "client",   ...ROLE_META.client },
  { id: "student",  ...ROLE_META.student },
  { id: "board",    ...ROLE_META.board },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, setUser, loading } = useAuth();

  // Step 1 — role hint picker (cosmetic)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Step 2 — credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 2b — multi-role selection
  const [pendingRoleSelect, setPendingRoleSelect] = useState<RoleSelectionRequired | null>(null);
  const [roleSelectError, setRoleSelectError] = useState("");
  const [roleSelecting, setRoleSelecting] = useState(false);

  // Step 3 — forced password change
  const [pendingUser, setPendingUser] = useState<PortalUser | null>(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeDone, setChangeDone] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    document.title = "Login | handləkraft.ai";
    if (!loading && user && !user.mustChangePassword) setLocation(getPortalPath(user.role));
  }, [user, loading, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
    } else if ("roleSelection" in result) {
      // Multi-role user — show role picker
      setPendingRoleSelect(result.roleSelection);
    } else if (result.user.mustChangePassword) {
      setLoginPassword(password);
      setPendingUser(result.user);
      setUser(result.user);
    } else {
      setUser(result.user);
      setLocation(getPortalPath(result.user.role));
    }
  }

  async function handleRoleSelect(role: string) {
    if (!pendingRoleSelect) return;
    setRoleSelectError("");
    setRoleSelecting(true);
    const result = await selectRole(pendingRoleSelect.pendingToken, role);
    setRoleSelecting(false);

    if ("error" in result) {
      setRoleSelectError(result.error);
    } else if (result.user.mustChangePassword) {
      setLoginPassword(password);
      setPendingUser(result.user);
      setUser(result.user);
      setPendingRoleSelect(null);
    } else {
      setUser(result.user);
      setLocation(getPortalPath(result.user.role));
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangeError("");
    if (newPassword.length < 8) { setChangeError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setChangeError("Passwords don't match."); return; }
    if (newPassword === loginPassword) { setChangeError("Your new password must be different from your temporary one."); return; }
    setChangingPw(true);
    const result = await changePassword(loginPassword, newPassword);
    setChangingPw(false);
    if (result.error) {
      setChangeError(result.error);
    } else {
      setChangeDone(true);
      setTimeout(() => {
        const updated = { ...pendingUser!, mustChangePassword: false };
        setUser(updated);
        setLocation(getPortalPath(updated.role));
      }, 1500);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#1A1F2B] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2B] via-[#1A1F2B] to-[#0D7377]/20 flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <a href="/" className="flex items-center gap-3 mb-2">
            <img src={logoImg} alt="handləkraft.ai" className="w-14 h-14 rounded-2xl shadow-lg" />
          </a>
          <h1 className="text-2xl font-display text-white mt-2">handləkraft.ai</h1>
          <p className="text-white/50 text-sm mt-1">Portal Access</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">

          {/* ── Step 3: Forced password change ─────────────────────────── */}
          {pendingUser ? (
            changeDone ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <p className="text-white font-semibold text-lg">Password updated!</p>
                <p className="text-white/50 text-sm text-center">Taking you to your portal…</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center mb-5 gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#0D7377]/20 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#0D7377]" />
                  </div>
                  <h2 className="text-lg font-semibold text-white text-center">Set your password</h2>
                  <p className="text-white/50 text-sm text-center">
                    Welcome, {pendingUser.firstName}! Your account has a temporary password.
                    Choose something secure and memorable before you dive in.
                  </p>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <Label className="text-white/70 text-sm">New password</Label>
                    <div className="relative mt-1">
                      <Input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required autoFocus className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#0D7377] pr-10" data-testid="input-new-password" />
                      <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && (
                      <p className={`text-xs mt-1 ${newPassword.length >= 12 ? "text-emerald-400" : newPassword.length >= 8 ? "text-yellow-400" : "text-red-400"}`}>
                        {newPassword.length >= 12 ? "Strong" : newPassword.length >= 8 ? "Good" : "Too short"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Confirm new password</Label>
                    <div className="relative mt-1">
                      <Input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#0D7377] pr-10" data-testid="input-confirm-password" />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && newPassword !== confirmPassword && <p className="text-xs mt-1 text-red-400">Passwords don't match yet</p>}
                    {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && <p className="text-xs mt-1 text-emerald-400">Passwords match ✓</p>}
                  </div>
                  {changeError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg" data-testid="text-change-error">{changeError}</div>}
                  <Button type="submit" disabled={changingPw || newPassword !== confirmPassword || newPassword.length < 8} className="w-full bg-[#0D7377] hover:bg-[#0D7377]/90 text-white font-semibold py-2.5 rounded-xl" data-testid="button-set-password">
                    {changingPw ? "Saving…" : "Set my password & continue"}
                  </Button>
                </form>
              </>
            )

          /* ── Step 2b: Multi-role selection ────────────────────────────── */
          ) : pendingRoleSelect ? (
            <>
              <div className="flex flex-col items-center mb-5 gap-2">
                <div className="w-10 h-10 rounded-full bg-[#0D7377]/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0D7377]" />
                </div>
                <h2 className="text-lg font-semibold text-white text-center">Choose your portal</h2>
                <p className="text-white/50 text-sm text-center">
                  Welcome back, {pendingRoleSelect.firstName}! Your account has access to multiple portals.
                  Which would you like to enter today?
                </p>
              </div>
              <div className="space-y-3">
                {pendingRoleSelect.roles.map(role => {
                  const meta = ROLE_META[role] || { label: role, icon: <Shield className="w-6 h-6" />, desc: "", color: "border-white/20 bg-white/5 text-white" };
                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      disabled={roleSelecting}
                      data-testid={`button-select-role-${role}`}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed ${meta.color}`}
                    >
                      <div className="shrink-0">{meta.icon}</div>
                      <div className="text-left">
                        <div className="font-semibold">{meta.label}</div>
                        {meta.desc && <div className="text-xs opacity-70">{meta.desc}</div>}
                      </div>
                      {roleSelecting && <div className="ml-auto w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    </button>
                  );
                })}
              </div>
              {roleSelectError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg" data-testid="text-role-select-error">
                  {roleSelectError}
                </div>
              )}
              <button
                onClick={() => { setPendingRoleSelect(null); setError(""); }}
                className="mt-4 flex items-center gap-1 text-white/40 hover:text-white/60 text-sm transition-colors"
                data-testid="button-back-credentials"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            </>

          /* ── Step 1: Role hint picker ──────────────────────────────────── */
          ) : !selectedRole ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-1 text-center">Who are you?</h2>
              <p className="text-white/40 text-sm text-center mb-6">Select your account type to continue</p>
              <div className="space-y-3">
                {hintRoles.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    data-testid={`button-role-${r.id}`}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.01] ${r.color}`}
                  >
                    <div className="shrink-0">{r.icon}</div>
                    <div className="text-left">
                      <div className="font-semibold">{r.label}</div>
                      <div className="text-xs opacity-70">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <a href="/" className="text-white/40 hover:text-white/60 text-sm flex items-center justify-center gap-1 transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Back to public site
                </a>
              </div>
            </>

          /* ── Step 2: Email + password ─────────────────────────────────── */
          ) : (
            <>
              <button onClick={() => { setSelectedRole(null); setError(""); }} className="flex items-center gap-1 text-white/40 hover:text-white/60 text-sm mb-4 transition-colors" data-testid="button-back-role">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className={`flex items-center gap-3 p-3 rounded-xl border mb-5 ${ROLE_META[selectedRole]?.color || ""}`}>
                {ROLE_META[selectedRole]?.icon}
                <div>
                  <div className="font-semibold text-sm">{ROLE_META[selectedRole]?.label}</div>
                  <div className="text-xs opacity-70">{ROLE_META[selectedRole]?.desc}</div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@handlekraft.ai" required className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#0D7377]" data-testid="input-email" />
                </div>
                <div>
                  <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                  <div className="relative mt-1">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-[#0D7377] pr-10" data-testid="input-password" />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg" data-testid="text-login-error">{error}</div>}
                <Button type="submit" disabled={submitting} className="w-full bg-[#0D7377] hover:bg-[#0D7377]/90 text-white font-semibold py-2.5 rounded-xl" data-testid="button-login-submit">
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-white/30 text-xs justify-center">
                  <Shield className="w-3 h-3" /> Secured by JWT authentication
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          © {new Date().getFullYear()} handləkraft.ai — A 501(c)(3) nonprofit initiative
        </p>
      </div>
    </div>
  );
}
