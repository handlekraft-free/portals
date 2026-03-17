import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { login, getPortalPath } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Building2, GraduationCap, Eye, EyeOff, ArrowLeft, Shield } from "lucide-react";
import logoImg from "@/assets/images/logo.png";

type Role = "employee" | "client" | "student";

const roles: { id: Role; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: "employee", label: "Team Member", icon: <Briefcase className="w-6 h-6" />, desc: "Employees & Staff", color: "border-[#0D7377] bg-[#0D7377]/10 text-[#0D7377]" },
  { id: "client", label: "Client", icon: <Building2 className="w-6 h-6" />, desc: "Organizations we serve", color: "border-[#D4A843] bg-[#D4A843]/10 text-[#D4A843]" },
  { id: "student", label: "Student", icon: <GraduationCap className="w-6 h-6" />, desc: "Fellowship Fellows", color: "border-purple-500 bg-purple-500/10 text-purple-600" },
];

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, setUser, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Login | handləkraft.ai";
    if (!loading && user) setLocation(getPortalPath(user.role));
  }, [user, loading, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setUser(result.user);
      setLocation(getPortalPath(result.user.role));
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
          {!selectedRole ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-1 text-center">Who are you?</h2>
              <p className="text-white/40 text-sm text-center mb-6">Select your account type to continue</p>
              <div className="space-y-3">
                {roles.map(r => (
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
          ) : (
            <>
              <button onClick={() => { setSelectedRole(null); setError(""); }} className="flex items-center gap-1 text-white/40 hover:text-white/60 text-sm mb-4 transition-colors" data-testid="button-back-role">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className={`flex items-center gap-3 p-3 rounded-xl border mb-5 ${roles.find(r => r.id === selectedRole)?.color}`}>
                {roles.find(r => r.id === selectedRole)?.icon}
                <div>
                  <div className="font-semibold text-sm">{roles.find(r => r.id === selectedRole)?.label}</div>
                  <div className="text-xs opacity-70">{roles.find(r => r.id === selectedRole)?.desc}</div>
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
