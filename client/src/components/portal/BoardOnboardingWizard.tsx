import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound, User, CalendarClock, LayoutDashboard, Eye, EyeOff,
  Check, ChevronRight, ChevronLeft, CalendarDays, FileText,
  CheckSquare, FileSignature, DollarSign, Users, Sparkles,
  ShieldCheck, Linkedin, Phone, Mail, Clock, X, BarChart3,
  Camera, Loader2, Upload,
} from "lucide-react";
import BoardExpertiseRater from "@/components/portal/BoardExpertiseRater";
import logoImg from "@/assets/images/logo.png";
import AvailabilityGrid from "@/components/portal/AvailabilityGrid";
import { BRAND } from "@shared/branding";

const STEPS = [
  { id: "welcome",      label: "Welcome",      icon: <Sparkles className="w-4 h-4" /> },
  { id: "password",     label: "Password",     icon: <KeyRound className="w-4 h-4" /> },
  { id: "profile",      label: "Profile",      icon: <User className="w-4 h-4" /> },
  { id: "expertise",    label: "Expertise",    icon: <BarChart3 className="w-4 h-4" /> },
  { id: "availability", label: "Availability", icon: <CalendarClock className="w-4 h-4" /> },
  { id: "tour",         label: "Portal Tour",  icon: <LayoutDashboard className="w-4 h-4" /> },
];

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function WelcomeStep({ firstName, onNext }: { firstName: string; onNext: () => void }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-16 h-16 rounded-2xl bg-[#0D7377]/10 flex items-center justify-center mx-auto">
        <Sparkles className="w-8 h-8 text-[#0D7377]" />
      </div>
      <div>
        <h2 className="text-2xl font-display text-[#1A1F2B] mb-2">Welcome, {firstName}!</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          You've been added to the <strong className="text-[#0D7377]">{BRAND.name}</strong> Board of Directors portal.
          This quick setup takes about 3 minutes and will get you ready to participate fully.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
        {[
          { icon: <KeyRound className="w-4 h-4 text-[#0D7377]" />, text: "Set a secure password" },
          { icon: <User className="w-4 h-4 text-[#0D7377]" />, text: "Complete your profile" },
          { icon: <BarChart3 className="w-4 h-4 text-[#0D7377]" />, text: "Rate your expertise" },
          { icon: <CalendarClock className="w-4 h-4 text-[#0D7377]" />, text: "Set your availability" },
          { icon: <LayoutDashboard className="w-4 h-4 text-[#0D7377]" />, text: "Tour the portal" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700">
            {item.icon} {item.text}
          </div>
        ))}
      </div>
      <Button onClick={onNext} className="bg-[#0D7377] hover:bg-[#0a5c60] text-white px-8 gap-2" data-testid="wizard-start">
        Get Started <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── Step 2: Change Password ───────────────────────────────────────────────────

function PasswordStep({ mustChange, onNext, onSkip }: { mustChange: boolean; onNext: () => void; onSkip: () => void }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = next.length === 0 ? 0 : next.length < 8 ? 1 : next.length < 12 && !/[A-Z]/.test(next) ? 2 : next.length >= 12 && /[A-Z]/.test(next) && /[0-9]/.test(next) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"];

  async function save() {
    if (next !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (next.length < 8) { toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" }); return; }
    setLoading(true);
    const r = await apiRequest("POST", "/api/auth/change-password", { currentPassword: current, newPassword: next });
    if (r.success) {
      setDone(true);
      toast({ title: "Password updated!", description: "Your new password is saved." });
      setTimeout(onNext, 900);
    } else {
      toast({ title: "Error", description: r.error || "Failed to update password.", variant: "destructive" });
    }
    setLoading(false);
  }

  if (done) return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Check className="w-7 h-7 text-green-600" />
      </div>
      <p className="text-lg font-semibold text-[#1A1F2B]">Password updated!</p>
      <p className="text-slate-500 text-sm mt-1">Moving to the next step…</p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-sm mx-auto">
      <div>
        <h2 className="text-xl font-display text-[#1A1F2B] mb-1">Set Your Password</h2>
        <p className="text-sm text-slate-500">
          {mustChange ? "An administrator set a temporary password for you. Please create a private one now." : "Update your password to something secure and memorable."}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Current Password</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Your current password"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
              data-testid="input-current-password"
            />
            <button onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">New Password</label>
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="8+ characters"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
              data-testid="input-new-password"
            />
            <button onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {next.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex gap-0.5 flex-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : "bg-slate-200"}`} />
                ))}
              </div>
              <span className="text-xs text-slate-500">{strengthLabel[strength]}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${confirm && confirm !== next ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-[#0D7377]/30"}`}
            data-testid="input-confirm-password"
          />
          {confirm && confirm !== next && <p className="text-xs text-red-500 mt-1">Passwords don't match</p>}
        </div>
      </div>

      <div className="flex gap-2">
        {!mustChange && (
          <Button onClick={onSkip} variant="outline" className="flex-1" data-testid="wizard-skip-password">
            Skip for now
          </Button>
        )}
        <Button
          onClick={save}
          disabled={loading || !current || !next || !confirm}
          className={`bg-[#0D7377] hover:bg-[#0a5c60] text-white gap-2 ${!mustChange ? "flex-1" : "w-full"}`}
          data-testid="wizard-save-password"
        >
          {loading ? "Saving…" : <><Check className="w-4 h-4" /> Update Password</>}
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Profile ───────────────────────────────────────────────────────────

function ProfileStep({ initialData, onNext, onSkip }: {
  initialData: { firstName: string; lastName: string; email: string; boardPosition?: string | null };
  onNext: () => void;
  onSkip: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    phone: "", linkedIn: "", preferredMeetingTimes: "", bio: "",
  });
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState<{ name: string } | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);

  async function save() {
    setLoading(true);
    const r = await apiRequest("PATCH", "/api/board/me", form);
    if (r.success) {
      toast({ title: "Profile saved!" });
      onNext();
    } else {
      toast({ title: "Error", description: r.error || "Failed to save.", variant: "destructive" });
    }
    setLoading(false);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/board/me/photo", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    if (data.success) { setPhotoUrl(data.photoUrl); toast({ title: "Photo saved!" }); }
    else toast({ title: "Upload failed", description: data.error, variant: "destructive" });
    setPhotoUploading(false);
    e.target.value = "";
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    const fd = new FormData();
    fd.append("resume", file);
    const res = await fetch("/api/board/me/resume", { method: "POST", body: fd, credentials: "include" });
    const data = await res.json();
    if (data.success) { setResumeFile({ name: data.resumeName }); toast({ title: "Resume saved!" }); }
    else toast({ title: "Upload failed", description: data.error, variant: "destructive" });
    setResumeUploading(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <div>
        <h2 className="text-xl font-display text-[#1A1F2B] mb-1">Your Profile</h2>
        <p className="text-sm text-slate-500">Help your fellow board members know you better. All fields are optional.</p>
      </div>

      {/* Identity card with photo upload */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
        <div className="relative group shrink-0">
          <div className="w-14 h-14 rounded-full bg-[#0D7377]/10 text-[#0D7377] font-bold text-sm flex items-center justify-center overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base">{initialData.firstName?.[0]}{initialData.lastName?.[0]}</span>
            )}
          </div>
          <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" title="Upload photo">
            {photoUploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} data-testid="input-wizard-photo" />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1A1F2B] text-sm">{initialData.firstName} {initialData.lastName}</p>
          <p className="text-xs text-slate-500">{initialData.email}</p>
          {initialData.boardPosition && (
            <Badge className="mt-0.5 bg-[#D4A843]/15 text-[#9a7420] border-[#D4A843]/30 text-xs gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />{initialData.boardPosition}
            </Badge>
          )}
          <p className="text-[10px] text-slate-400 mt-1">Hover photo to upload</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Phone number"
            type="tel"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            data-testid="input-wizard-phone"
          />
        </div>
        <div className="flex items-center gap-3">
          <Linkedin className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={form.linkedIn}
            onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))}
            placeholder="LinkedIn profile URL"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            data-testid="input-wizard-linkedin"
          />
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={form.preferredMeetingTimes}
            onChange={e => setForm(f => ({ ...f, preferredMeetingTimes: e.target.value }))}
            placeholder="Preferred meeting times (e.g. Tue/Thu 5–7 PM PST)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
            data-testid="input-wizard-times"
          />
        </div>
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-slate-400 shrink-0 mt-3" />
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Short bio — your background, expertise, why you serve on this board…"
            rows={3}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none"
            data-testid="textarea-wizard-bio"
          />
        </div>
      </div>

      {/* Resume upload */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-medium text-[#1A1F2B]">Resume / CV</p>
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-[#0D7377] cursor-pointer hover:text-[#0a5c60] transition-colors" data-testid="wizard-upload-resume-label">
            {resumeUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {resumeFile ? "Replace" : "Upload"}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} data-testid="input-wizard-resume" />
          </label>
        </div>
        {resumeFile ? (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> {resumeFile.name}
          </p>
        ) : (
          <p className="text-xs text-slate-400">PDF or Word, max 10 MB. Optional.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={onSkip} variant="outline" className="flex-1" data-testid="wizard-skip-profile">
          Skip for now
        </Button>
        <Button onClick={save} disabled={loading} className="flex-1 bg-[#0D7377] hover:bg-[#0a5c60] text-white gap-2" data-testid="wizard-save-profile">
          {loading ? "Saving…" : <><Check className="w-4 h-4" /> Save Profile</>}
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Expertise ─────────────────────────────────────────────────────────

function ExpertiseStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { toast } = useToast();
  const [expertise, setExpertise] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const r = await apiRequest("PATCH", "/api/board/me", { boardExpertise: expertise });
    if (r.success) {
      toast({ title: "Expertise saved!", description: "Your self-ratings have been recorded." });
      onNext();
    } else {
      toast({ title: "Error", description: r.error || "Failed to save.", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display text-[#1A1F2B] mb-1">Your Board Expertise</h2>
        <p className="text-sm text-slate-500">
          Rate yourself on each knowledge area. This helps the board understand its collective strengths and gaps — and guides recruitment priorities. All ratings are visible to fellow board members.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 max-h-[50vh] overflow-y-auto">
        <BoardExpertiseRater value={expertise} onChange={setExpertise} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onSkip} variant="outline" className="flex-1" data-testid="wizard-skip-expertise">
          Skip for now
        </Button>
        <Button onClick={save} disabled={loading} className="flex-1 bg-[#0D7377] hover:bg-[#0a5c60] text-white gap-2" data-testid="wizard-save-expertise">
          {loading ? "Saving…" : <><Check className="w-4 h-4" /> Save Expertise</>}
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: Availability ──────────────────────────────────────────────────────

function AvailabilityStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display text-[#1A1F2B] mb-1">When Are You Available?</h2>
        <p className="text-sm text-slate-500">
          Check the windows when you're typically free for a 90-minute board meeting. This helps find dates everyone can make.
        </p>
      </div>
      <AvailabilityGrid
        wizardMode
        onNext={onNext}
        onSkip={onSkip}
        testIdPrefix="wizard-avail"
      />
    </div>
  );
}

// ── Step 5: Portal Tour ───────────────────────────────────────────────────────

const TOUR_ITEMS = [
  {
    icon: <CalendarDays className="w-5 h-5 text-indigo-500" />,
    title: "Meetings",
    desc: "Schedule and track board meetings, manage RSVPs, record attendance, and access meeting packets.",
    href: "/portal/board/meetings",
    bg: "bg-indigo-50 border-indigo-100",
  },
  {
    icon: <CalendarClock className="w-5 h-5 text-[#0D7377]" />,
    title: "Schedule Coordinator",
    desc: "Create time polls so the whole board can vote on availability — then confirm the winner as a meeting.",
    href: "/portal/board/scheduling",
    bg: "bg-teal-50 border-teal-100",
  },
  {
    icon: <FileText className="w-5 h-5 text-blue-500" />,
    title: "Documents",
    desc: "Access board documents, financial reports, policies, and meeting materials — all version-controlled.",
    href: "/portal/board/documents",
    bg: "bg-blue-50 border-blue-100",
  },
  {
    icon: <CheckSquare className="w-5 h-5 text-amber-500" />,
    title: "Action Items",
    desc: "Track follow-through on commitments from meetings. Assigned items appear here with due dates.",
    href: "/portal/board/action-items",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    icon: <FileSignature className="w-5 h-5 text-violet-500" />,
    title: "Written Consents",
    desc: "Vote on matters between meetings. Legally binding board actions without scheduling another call.",
    href: "/portal/board/consents",
    bg: "bg-violet-50 border-violet-100",
  },
  {
    icon: <Users className="w-5 h-5 text-rose-500" />,
    title: "Directory",
    desc: "Contact information for all board members. Update your own profile from the My Profile section.",
    href: "/portal/board/directory",
    bg: "bg-rose-50 border-rose-100",
  },
];

function TourStep({ onFinish, loading }: { onFinish: () => void; loading: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display text-[#1A1F2B] mb-1">You're Almost Ready!</h2>
        <p className="text-sm text-slate-500">Here's a quick overview of your board portal. You can explore each section from the sidebar at any time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOUR_ITEMS.map(item => (
          <div key={item.title} className={`rounded-xl border p-3.5 ${item.bg}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {item.icon}
              <span className="text-sm font-semibold text-[#1A1F2B]">{item.title}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0D7377]/5 border border-[#0D7377]/15 rounded-xl p-4 text-sm text-slate-600">
        <p className="font-medium text-[#0D7377] mb-1">One more thing</p>
        <p>Check your notifications (bell icon in the header) for meeting reminders, document requests, and action items assigned to you.</p>
      </div>

      <Button
        onClick={onFinish}
        disabled={loading}
        className="w-full bg-[#0D7377] hover:bg-[#0a5c60] text-white py-3 gap-2 text-base"
        data-testid="wizard-finish"
      >
        {loading ? "Setting up…" : <><Sparkles className="w-5 h-5" /> Enter the Board Member Portal</>}
      </Button>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function BoardOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const next = useCallback(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0)), []);

  async function finish() {
    setFinishing(true);
    await apiRequest("PATCH", "/api/board/onboarding-complete");
    if (user) setUser({ ...user, onboardingComplete: true });
    onComplete();
  }

  const stepId = STEPS[step].id;
  const mustChange = user?.mustChangePassword ?? false;
  const firstName = user?.firstName ?? "there";

  return (
    <div className="fixed inset-0 z-50 bg-[#F5F3EF] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt={BRAND.name} className="h-7 w-auto" />
          <span className="font-display text-[#1A1F2B] text-lg hidden sm:inline">Board Member Portal Setup</span>
        </div>
        {/* Step pills */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { if (i < step) setStep(i); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                i === step ? "bg-[#0D7377] text-white shadow-sm" :
                i < step ? "bg-[#0D7377]/15 text-[#0D7377] cursor-pointer hover:bg-[#0D7377]/25" :
                "bg-slate-100 text-slate-400 cursor-default"
              }`}
            >
              {i < step ? <Check className="w-3 h-3" /> : s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {stepId === "welcome" && (
            <WelcomeStep firstName={firstName} onNext={next} />
          )}
          {stepId === "password" && (
            <PasswordStep mustChange={mustChange} onNext={next} onSkip={next} />
          )}
          {stepId === "profile" && (
            <ProfileStep
              initialData={{ firstName, lastName: user?.lastName ?? "", email: user?.email ?? "", boardPosition: user?.boardPosition }}
              onNext={next}
              onSkip={next}
            />
          )}
          {stepId === "expertise" && (
            <ExpertiseStep onNext={next} onSkip={next} />
          )}
          {stepId === "availability" && (
            <AvailabilityStep onNext={next} onSkip={next} />
          )}
          {stepId === "tour" && (
            <TourStep onFinish={finish} loading={finishing} />
          )}
        </div>
      </div>

      {/* Footer nav */}
      {stepId !== "welcome" && stepId !== "tour" && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
          <Button onClick={back} variant="ghost" size="sm" className="gap-1 text-slate-500" data-testid="wizard-back">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? "bg-[#0D7377] w-4" : i < step ? "bg-[#0D7377]/40" : "bg-slate-300"}`} />
            ))}
          </div>
          <span className="text-xs text-slate-400">{step + 1} of {STEPS.length}</span>
        </div>
      )}
    </div>
  );
}
