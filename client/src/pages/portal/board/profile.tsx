import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Pencil, Check, X, Linkedin, Phone, Mail, Clock, ShieldCheck, Sparkles, LayoutDashboard, CalendarClock } from "lucide-react";
import BoardOnboardingWizard from "@/components/portal/BoardOnboardingWizard";
import AvailabilityGrid from "@/components/portal/AvailabilityGrid";

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
  avatarUrl?: string | null;
}

export default function BoardProfilePage() {
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

  useEffect(() => { document.title = "My Profile | handləkraft Board"; }, []);

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
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const r = await apiRequest("PATCH", "/api/board/me", form);
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
      <Link href="/portal/board/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0D7377] mb-4 transition-colors no-underline" data-testid="link-back-dashboard">
        <LayoutDashboard className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">My Profile</h1>
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
              className="bg-[#0D7377] hover:bg-[#0a5c60] text-white gap-1 h-9"
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
            <div className="w-16 h-16 rounded-full bg-[#0D7377]/10 flex items-center justify-center text-[#0D7377] text-xl font-bold shrink-0" data-testid="profile-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={fullName} className="w-full h-full rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 w-32"
                    data-testid="input-first-name"
                  />
                  <input
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 w-36"
                    data-testid="input-last-name"
                  />
                </div>
              ) : (
                <p className="text-lg font-semibold text-[#1A1F2B]" data-testid="profile-name">{fullName}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-1.5">
                {profile.boardPosition && (
                  <Badge className="bg-[#D4A843]/15 text-[#9a7420] border-[#D4A843]/30 gap-1" data-testid="profile-position">
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                  data-testid="input-email"
                />
              ) : (
                <p className="text-sm text-[#1A1F2B]" data-testid="profile-email">{profile.email}</p>
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                  data-testid="input-phone"
                />
              ) : (
                <p className="text-sm text-[#1A1F2B]" data-testid="profile-phone">
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                  data-testid="input-linkedin"
                />
              ) : (
                <p className="text-sm" data-testid="profile-linkedin">
                  {profile.linkedIn ? (
                    <a href={profile.linkedIn} target="_blank" rel="noopener noreferrer" className="text-[#0D7377] hover:underline">
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
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                  data-testid="input-preferred-times"
                />
              ) : (
                <p className="text-sm text-[#1A1F2B]" data-testid="profile-preferred-times">
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
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 resize-none"
              data-testid="textarea-bio"
            />
          ) : (
            <p className="text-sm text-[#1A1F2B] whitespace-pre-wrap" data-testid="profile-bio">
              {profile.bio || <span className="text-slate-400 italic">No bio provided. Click "Edit Profile" to add one.</span>}
            </p>
          )}
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
                    <p className="text-sm font-medium text-[#1A1F2B]">{new Date(profile.termStart).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                  </div>
                )}
                {profile.termEnd && (
                  <div>
                    <p className="text-xs text-slate-400">Term End</p>
                    <p className="text-sm font-medium text-[#1A1F2B]">{new Date(profile.termEnd).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
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
            <CalendarClock className="w-4 h-4 text-[#0D7377]" />
            <h2 className="text-base font-semibold text-[#1A1F2B]">Meeting Availability</h2>
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
          <p className="text-sm font-semibold text-[#1A1F2B]">Setup Wizard</p>
          <p className="text-xs text-slate-500 mt-0.5">Walk through onboarding steps again — password, profile, and availability.</p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          variant="outline"
          className="gap-2 text-[#0D7377] border-[#0D7377]/30 hover:bg-[#0D7377]/5 shrink-0"
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
