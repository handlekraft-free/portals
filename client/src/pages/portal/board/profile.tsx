import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Pencil, Check, X, Linkedin, Phone, Mail, Clock, ShieldCheck, Sparkles, LayoutDashboard, CalendarClock, BarChart3, Camera, Loader2, Upload, Download, FileText } from "lucide-react";
import BoardOnboardingWizard from "@/components/portal/BoardOnboardingWizard";
import AvailabilityGrid from "@/components/portal/AvailabilityGrid";
import BoardExpertiseRater from "@/components/portal/BoardExpertiseRater";
import { BRAND } from "@shared/branding";

interface BoardProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  linkedIn?: string | null;
  preferredMeetingTimes?: string | null;
  bio?: string | null;
  boardPosition?: string | null;
  committees?: string[] | null;
  termStart?: string | null;
  termEnd?: string | null;
  role: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  boardExpertise?: Record<string, string> | null;
  resumeUrl?: string | null;
  resumeName?: string | null;
}

function BoardProfileContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<BoardProfile | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    linkedIn: "",
    preferredMeetingTimes: "",
    bio: "",
  });
  const [expertiseForm, setExpertiseForm] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const res = await fetch("/api/board/me/photo", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => prev ? { ...prev, photoUrl: data.photoUrl } : prev);
        toast({ title: "Photo updated!" });
      } else {
        toast({ title: "Upload failed", description: data.error || "Could not upload photo.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setPhotoUploading(false);
    e.target.value = "";
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeUploading(true);
    const fd = new FormData();
    fd.append("resume", file);
    try {
      const res = await fetch("/api/board/me/resume", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setProfile(prev => prev ? { ...prev, resumeUrl: data.resumeUrl, resumeName: data.resumeName } : prev);
        toast({ title: "Resume uploaded!" });
      } else {
        toast({ title: "Upload failed", description: data.error || "Could not upload resume.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setResumeUploading(false);
    e.target.value = "";
  }

  useEffect(() => { document.title = `My Profile | ${BRAND.name} Board`; }, []);

  useEffect(() => {
    async function load() {
      const r = await apiRequest("GET", "/api/board/me");
      if (r.success) {
        setProfile(r.data);
        setForm({
          firstName: r.data.firstName || "",
          lastName: r.data.lastName || "",
          email: r.data.email || "",
          phone: r.data.phone || "",
          linkedIn: r.data.linkedIn || "",
          preferredMeetingTimes: r.data.preferredMeetingTimes || "",
          bio: r.data.bio || "",
        });
        setExpertiseForm(r.data.boardExpertise || {});
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const r = await apiRequest("PATCH", "/api/board/me", { ...form, boardExpertise: expertiseForm });
    if (r.success) {
      setProfile(prev => prev ? { ...prev, ...r.data } : prev);
      setEditing(false);
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } else {
      toast({ title: "Error", description: r.error || "Failed to save profile.", variant: "destructive" });
    }
    setSaving(false);
  }

  function cancelEdit() {
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        linkedIn: profile.linkedIn || "",
        preferredMeetingTimes: profile.preferredMeetingTimes || "",
        bio: profile.bio || "",
      });
      setExpertiseForm(profile.boardExpertise || {});
    }
    setEditing(false);
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
      <div className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-20 text-slate-400">Could not load profile.</div>
  );

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/portal/board/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#2563EB] mb-4 transition-colors no-underline" data-testid="link-back-dashboard">
        <LayoutDashboard className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#0F172A]">My Profile</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your board member profile and contact information.</p>
        </div>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            className="gap-2"
            data-testid="button-edit-profile"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button onClick={cancelEdit} variant="outline" className="gap-1 h-9" data-testid="button-cancel-edit">
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-[#2563EB] hover:bg-[#0a5c60] text-white gap-1 h-9"
              data-testid="button-save-profile"
            >
              <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Avatar + Name card */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0" data-testid="profile-avatar">
              <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] text-xl font-bold overflow-hidden">
                {(profile.photoUrl || profile.avatarUrl) ? (
                  <img src={profile.photoUrl || profile.avatarUrl!} alt={fullName} className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" title="Upload photo">
                {photoUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} data-testid="input-photo-upload" />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 w-32"
                    data-testid="input-first-name"
                  />
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 w-36"
                    data-testid="input-last-name"
                  />
                </div>
              ) : (
                <p className="text-lg font-semibold text-[#0F172A]" data-testid="profile-name">{fullName}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-1.5">
                {profile.boardPosition && (
                  <Badge className="bg-[#10B981]/15 text-[#9a7420] border-[#10B981]/30 gap-1" data-testid="profile-position">
                    <ShieldCheck className="w-3 h-3" /> {profile.boardPosition}
                  </Badge>
                )}
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {profile.role === "admin" ? "Administrator" : "Board Member"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact info card */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-5 pb-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Information</p>

          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Email</p>
              {editing ? (
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  type="email"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  data-testid="input-email"
                />
              ) : (
                <p className="text-sm text-[#0F172A]" data-testid="profile-email">{profile.email}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Phone</p>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  type="tel"
                  placeholder="(555) 000-0000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  data-testid="input-phone"
                />
              ) : (
                <p className="text-sm text-[#0F172A]" data-testid="profile-phone">
                  {profile.phone || <span className="text-slate-400 italic">Not provided</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Linkedin className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">LinkedIn</p>
              {editing ? (
                <input
                  value={form.linkedIn}
                  onChange={e => setForm(f => ({ ...f, linkedIn: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  data-testid="input-linkedin"
                />
              ) : (
                <p className="text-sm" data-testid="profile-linkedin">
                  {profile.linkedIn ? (
                    <a href={profile.linkedIn} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                      {profile.linkedIn}
                    </a>
                  ) : <span className="text-slate-400 italic">Not provided</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Preferred Meeting Times</p>
              {editing ? (
                <input
                  value={form.preferredMeetingTimes}
                  onChange={e => setForm(f => ({ ...f, preferredMeetingTimes: e.target.value }))}
                  placeholder="e.g. Weekdays 5–7 PM PST"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                  data-testid="input-preferred-times"
                />
              ) : (
                <p className="text-sm text-[#0F172A]" data-testid="profile-preferred-times">
                  {profile.preferredMeetingTimes || <span className="text-slate-400 italic">Not provided</span>}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio card */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-5 pb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bio / Summary</p>
          {editing ? (
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Share a brief bio about your background, expertise, and why you serve on this board…"
              rows={5}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 resize-none"
              data-testid="textarea-bio"
            />
          ) : (
            <p className="text-sm text-[#0F172A] whitespace-pre-wrap" data-testid="profile-bio">
              {profile.bio || <span className="text-slate-400 italic">No bio provided. Click "Edit Profile" to add one.</span>}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Board Expertise card */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#2563EB]" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Board Expertise</p>
          </div>
          {editing ? (
            <BoardExpertiseRater value={expertiseForm} onChange={setExpertiseForm} />
          ) : (
            <BoardExpertiseRater value={profile.boardExpertise || {}} readOnly />
          )}
        </CardContent>
      </Card>

      {/* Resume / CV card */}
      <Card className="border-0 shadow-sm mb-5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resume / CV</p>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB] cursor-pointer hover:text-[#0a5c60] transition-colors" data-testid="button-upload-resume">
              {resumeUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {profile.resumeUrl ? "Replace" : "Upload"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} data-testid="input-resume-upload" />
            </label>
          </div>
          {profile.resumeUrl ? (
            <a
              href={profile.resumeUrl}
              className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-3 hover:bg-slate-100 transition-colors no-underline"
              data-testid="link-download-resume"
            >
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate text-sm text-[#0F172A]">{profile.resumeName || "Resume"}</span>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>
          ) : (
            <p className="text-sm text-slate-400 italic">No resume uploaded.</p>
          )}
          <p className="text-xs text-slate-400 mt-2">PDF or Word, max 10 MB. Visible to all board members.</p>
        </CardContent>
      </Card>

      {/* Board service info (read-only) */}
      {(profile.termStart || profile.termEnd || (profile.committees && profile.committees.length > 0)) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Board Service</p>
            {(profile.termStart || profile.termEnd) && (
              <div className="flex gap-6 mb-3">
                {profile.termStart && (
                  <div>
                    <p className="text-xs text-slate-400">Term Start</p>
                    <p className="text-sm font-medium text-[#0F172A]">{new Date(profile.termStart).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                  </div>
                )}
                {profile.termEnd && (
                  <div>
                    <p className="text-xs text-slate-400">Term End</p>
                    <p className="text-sm font-medium text-[#0F172A]">{new Date(profile.termEnd).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                  </div>
                )}
              </div>
            )}
            {profile.committees && profile.committees.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-1.5">Committees</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.committees.map((c: string) => (
                    <Badge key={c} className="bg-slate-100 text-slate-600 border-slate-200 text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Availability */}
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-semibold text-[#0F172A]">Meeting Availability</h2>
          </div>
          <p className="text-sm text-slate-500 -mt-2">
            Mark the windows when you're typically free for a 90-minute board meeting. Used by the Schedule Coordinator to find the best meeting times.
          </p>
          <AvailabilityGrid autoLoad testIdPrefix="profile-avail" />
        </CardContent>
      </Card>

      {/* Relaunch setup wizard */}
      <div className="mt-2 border border-dashed border-slate-200 rounded-2xl p-5 flex items-center justify-between bg-white/50">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Setup Wizard</p>
          <p className="text-xs text-slate-500 mt-0.5">Walk through onboarding steps again — password, profile, and availability.</p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          variant="outline"
          className="gap-2 text-[#2563EB] border-[#2563EB]/30 hover:bg-[#2563EB]/5 shrink-0"
          data-testid="button-relaunch-wizard"
        >
          <Sparkles className="w-4 h-4" /> Relaunch Wizard
        </Button>
      </div>

      {showWizard && (
        <BoardOnboardingWizard onComplete={() => { setShowWizard(false); setLocation("/portal/board/dashboard"); }} />
      )}
    </div>
  );
}

export default function BoardProfilePage() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><BoardProfileContent /></BoardLayout>
    </PortalGuard>
  );
}
