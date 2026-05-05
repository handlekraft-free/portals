import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { Switch } from "@/components/ui/switch";
import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Calendar, CheckCircle2, Loader2, LogOut, ExternalLink,
  RefreshCw, Plus, Pencil, Trash2, Check, X, Wand2,
} from "lucide-react";
import { AvatarRenderer, type AvatarConfig } from "@/components/portal/AvatarRenderer";
import { AvatarCustomizer } from "@/components/portal/AvatarCustomizer";

// Profile-surface avatar customization card. Mirrors the HeroCard popover
// entry-point so users can find avatar customization on the Settings page
// (the de facto profile surface in this portal — there's no separate /profile).
function AvatarCustomizationCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<AvatarConfig | null>(null);
  useEffect(() => {
    apiRequest("GET", "/api/auth/me").then((res) => {
      if (res?.success) setCfg((res.data?.avatarConfig as AvatarConfig) ?? null);
    }).catch(() => {});
    const onChanged = (e: Event) => {
      const c = (e as CustomEvent<{ config: AvatarConfig }>).detail?.config;
      if (c) setCfg(c);
    };
    window.addEventListener("hk:avatar-changed", onChanged);
    return () => window.removeEventListener("hk:avatar-changed", onChanged);
  }, []);
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
  return (
    <Card className="border border-slate-200 shadow-sm" data-testid="card-avatar-customization">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-slate-400" />
          Your hero avatar
        </CardTitle>
        <CardDescription>
          Cosmetic layers (helm, beard, cloak, emblem) unlock as you climb the ranks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-full bg-slate-50 p-2 ring-1 ring-slate-200">
          <AvatarRenderer initials={initials} config={cfg} size={64} />
        </div>
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          data-testid="button-customize-avatar-settings"
        >
          Customize
        </Button>
      </CardContent>
      <AvatarCustomizer
        isOpen={open}
        initials={initials}
        initialConfig={cfg}
        onClose={() => setOpen(false)}
        onSaved={(c) => { setCfg(c); setOpen(false); }}
      />
    </Card>
  );
}

const ACCOUNT_COLORS = [
  { bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50 border-teal-200" },
  { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50 border-purple-200" },
  { bg: "bg-orange-500", text: "text-orange-600", light: "bg-orange-50 border-orange-200" },
  { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50 border-blue-200" },
];

function AccountRow({
  acct,
  index,
  onRemove,
  onLabelSave,
}: {
  acct: { id: number; email: string; label: string };
  index: number;
  onRemove: (id: number) => void;
  onLabelSave: (id: number, label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(acct.label);
  const color = ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];

  function save() {
    if (draft.trim() && draft.trim() !== acct.label) onLabelSave(acct.id, draft.trim());
    setEditing(false);
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
      data-testid={`row-google-account-${acct.id}`}
    >
      <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {acct.email[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
              className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
              data-testid={`input-account-label-${acct.id}`}
            />
            <button onClick={save} className="text-emerald-600 hover:text-emerald-700" data-testid={`button-save-label-${acct.id}`}>
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setDraft(acct.label); setEditing(false); }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${color.text}`}>{acct.label}</span>
            <button
              onClick={() => setEditing(true)}
              className="text-slate-300 hover:text-slate-500 transition-colors"
              data-testid={`button-edit-label-${acct.id}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <p className="text-sm text-slate-600 truncate mt-0.5">{acct.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
        </Badge>
        <button
          onClick={() => onRemove(acct.id)}
          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded"
          title="Disconnect account"
          data-testid={`button-remove-account-${acct.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SagaRecapCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [time, setTime] = useState<string>("17:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest("GET", "/api/auth/me").then((res) => {
      if (res?.success && res.data) {
        setEnabled(res.data.sagaRecapEnabled !== false);
        setTime(typeof res.data.sagaRecapTime === "string" ? res.data.sagaRecapTime : "17:00");
      }
    }).catch(() => {});
  }, []);

  async function save(patch: { enabled?: boolean; time?: string }) {
    setSaving(true);
    const res = await apiRequest("PATCH", "/api/auth/saga-recap-prefs", patch);
    setSaving(false);
    if (res?.success) {
      if (typeof patch.enabled === "boolean") setEnabled(patch.enabled);
      if (typeof patch.time === "string") setTime(patch.time);
      // Notify SagaRecapModal so its in-memory prefs refresh immediately,
      // without waiting for a full page reload.
      window.dispatchEvent(new CustomEvent("hk:saga-recap-prefs-changed"));
      toast({ title: "Saga Recap settings saved" });
    } else {
      toast({ title: "Could not save settings", variant: "destructive" });
    }
  }

  return (
    <Card className="border border-slate-200 shadow-sm" data-testid="card-saga-recap">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-[#0D7377]" />
          Today's Saga (end-of-day recap)
        </CardTitle>
        <CardDescription className="text-xs">
          A short scroll at the end of your workday: the deeds you completed, XP earned, and stats moved.
          Just for you — never seen by teammates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">
            {enabled === null ? "Loading…" : enabled ? "Enabled" : "Off"}
          </span>
          <Switch
            checked={enabled === true}
            disabled={saving || enabled === null}
            onCheckedChange={(v) => save({ enabled: v })}
            data-testid="switch-saga-recap-enabled"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600" htmlFor="saga-recap-time">Show me at</label>
          <input
            id="saga-recap-time"
            type="time"
            value={time}
            disabled={saving || enabled === false}
            onChange={(e) => setTime(e.target.value)}
            onBlur={(e) => save({ time: e.target.value })}
            className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-28 disabled:opacity-50"
            data-testid="input-saga-recap-time"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SagaOptOutCard() {
  const { toast } = useToast();
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest("GET", "/api/crew/saga").then(res => {
      if (res?.success) setOptOut(!!res.data?.optOut);
    }).catch(() => {});
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    const res = await apiRequest("PATCH", "/api/crew/saga/optout", { optOut: next });
    setSaving(false);
    if (res?.success) {
      setOptOut(next);
      toast({ title: next ? "Saga of the Week hidden for the team" : "Saga of the Week visible to the team" });
    } else {
      toast({ title: "Could not update setting", variant: "destructive" });
    }
  }

  return (
    <Card className="border border-slate-200 shadow-sm" data-testid="card-saga-optout">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-[#D4A843]" />
          Saga of the Week
        </CardTitle>
        <CardDescription className="text-xs">
          A Friday-afternoon dashboard card that recaps the crew's week in a short anonymous narrative
          (quests shipped, reviews, crew bonds). It never names individuals and never compares teammates.
          Toggle off to hide it from everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="text-sm text-slate-600">
          {optOut === null ? "Loading…" : optOut ? "Hidden from the whole team" : "Visible to the whole team"}
        </span>
        <Switch
          checked={optOut === false}
          disabled={saving || optOut === null}
          onCheckedChange={(checked) => toggle(!checked)}
          data-testid="switch-saga-optout"
          aria-label="Show Saga of the Week to the team"
        />
      </CardContent>
    </Card>
  );
}

export default function EmployeeSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isManager = user?.role === "admin" || (user as unknown as { canApprove?: boolean })?.canApprove === true;
  const [addingAccount, setAddingAccount] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [connectPending, setConnectPending] = useState(false);

  const { data: accountsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/google/accounts"],
    queryFn: () => apiRequest("GET", "/api/google/accounts"),
  });
  const accounts: Array<{ id: number; email: string; label: string }> = accountsData?.data?.accounts ?? [];

  const { data: notifsData } = useQuery({
    queryKey: ["/api/google/notifications"],
    queryFn: () => apiRequest("GET", "/api/google/notifications"),
    enabled: accounts.length > 0,
  });
  const notifCount: number = notifsData?.data?.notifications?.length ?? 0;

  const removeAccount = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/google/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google/notifications"] });
      toast({ title: "Google account disconnected" });
    },
    onError: () => toast({ title: "Error", description: "Could not disconnect account.", variant: "destructive" }),
  });

  const updateLabel = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      apiRequest("PATCH", `/api/google/accounts/${id}`, { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/accounts"] });
      toast({ title: "Label updated" });
    },
  });

  async function startConnect() {
    const label = newLabel.trim() || "Primary";
    const hint = newEmail.trim();
    setConnectPending(true);
    try {
      const qs = new URLSearchParams({ label });
      if (hint) qs.set("hint", hint);
      const res = await apiRequest("GET", `/api/google/oauth/url?${qs}`);
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("No URL");
      }
    } catch {
      toast({ title: "Error", description: "Could not start Google sign-in.", variant: "destructive" });
      setConnectPending(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "connected") {
      toast({ title: "Google account connected!", description: "Gmail and Calendar data are now active." });
      refetch();
      window.history.replaceState({}, "", "/portal/employee/settings");
    } else if (googleParam === "error") {
      const msg = params.get("msg") || "unknown_error";
      toast({
        title: "Google connection failed",
        description: `Error: ${msg.replace(/_/g, " ")}. Please try again.`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/portal/employee/settings");
    }
  }, []);

  return (
    <EmployeeLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display text-[#1A1F2B]">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your portal preferences and connected services.</p>
        </div>

        {/* Google Integration Card */}
        <Card className="border border-slate-200 shadow-sm" data-testid="card-google-integration">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-base">Google Accounts</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Gmail + Google Calendar for each connected account</CardDescription>
                </div>
              </div>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : accounts.length > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {accounts.length} connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 text-xs">Not connected</Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {accounts.length > 0 ? (
              <>
                {/* Account list */}
                <div className="space-y-2">
                  {accounts.map((acct, i) => (
                    <AccountRow
                      key={acct.id}
                      acct={acct}
                      index={i}
                      onRemove={(id) => removeAccount.mutate(id)}
                      onLabelSave={(id, label) => updateLabel.mutate({ id, label })}
                    />
                  ))}
                </div>

                {/* What each account provides */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Per-account features</p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>4 most recent inbox messages shown in the dashboard banner</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Next 3 upcoming meetings (within 7 days) shown in the dashboard banner</span>
                  </div>
                  {notifCount > 0 && (
                    <div className="text-xs text-slate-400 pt-1 border-t border-slate-200">
                      {notifCount} cached notification{notifCount !== 1 ? "s" : ""} in your notification feed
                    </div>
                  )}
                </div>

                {/* Quick links + add another */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="text-slate-600 border-slate-200"
                    onClick={() => window.open("https://mail.google.com", "_blank", "noopener,noreferrer")}
                    data-testid="button-open-gmail">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Gmail
                  </Button>
                  <Button variant="outline" size="sm" className="text-slate-600 border-slate-200"
                    onClick={() => window.open("https://calendar.google.com", "_blank", "noopener,noreferrer")}
                    data-testid="button-open-calendar">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Calendar
                  </Button>
                  <Button variant="outline" size="sm"
                    className="text-[#0D7377] border-[#0D7377]/30 hover:bg-teal-50 ml-auto"
                    onClick={() => { setAddingAccount(true); setNewLabel(""); }}
                    data-testid="button-add-account">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add another account
                  </Button>
                </div>

                {/* Add account form */}
                {addingAccount && (
                  <div className="rounded-xl border border-[#0D7377]/20 bg-teal-50/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#1A1F2B]">Add another Google account</p>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Google email address <span className="text-slate-400 font-normal">(ensures the right account is selected)</span>
                      </label>
                      <input
                        autoFocus
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && startConnect()}
                        placeholder="you@example.com"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                        data-testid="input-new-account-email"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Label <span className="text-slate-400 font-normal">(e.g. "Work", "Personal")</span>
                      </label>
                      <input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && startConnect()}
                        placeholder="e.g. Work"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                        data-testid="input-new-account-label"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-[#0D7377] hover:bg-[#0a5f62] text-white"
                        onClick={startConnect}
                        disabled={connectPending}
                        data-testid="button-connect-new-account"
                      >
                        {connectPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : (
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1.5">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        )}
                        Continue to Google
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setAddingAccount(false); setNewLabel(""); setNewEmail(""); }}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">Read-only access — handləkraft cannot send emails or modify your calendar.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Connect a Google account to see your Gmail and Calendar in the dashboard banner and receive notifications in the bell icon.
                </p>
                <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">What you'll get</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-4 h-4 text-red-400 shrink-0" />
                    <span>4 most recent inbox messages per account</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Next 3 upcoming meetings per account (within 7 days)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Plus className="w-4 h-4 text-[#0D7377] shrink-0" />
                    <span>Add as many Google accounts as you need</span>
                  </div>
                </div>

                {!addingAccount ? (
                  <Button
                    className="bg-[#0D7377] hover:bg-[#0a5f62] text-white w-full sm:w-auto"
                    onClick={() => { setAddingAccount(true); setNewLabel("Primary"); }}
                    data-testid="button-connect-google"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect Google Account
                  </Button>
                ) : (
                  <div className="rounded-xl border border-[#0D7377]/20 bg-teal-50/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-[#1A1F2B]">Connect your Google account</p>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">
                        Label for this account <span className="text-slate-400 font-normal">(e.g. "Work", "Personal")</span>
                      </label>
                      <input
                        autoFocus
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && startConnect()}
                        placeholder="e.g. Primary"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30"
                        data-testid="input-new-account-label"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#0D7377] hover:bg-[#0a5f62] text-white" onClick={startConnect} disabled={connectPending} data-testid="button-connect-new-account">
                        {connectPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : (
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 mr-1.5">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        )}
                        Continue to Google
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setAddingAccount(false)}>Cancel</Button>
                    </div>
                    <p className="text-xs text-slate-400">Read-only access — handləkraft cannot send emails or modify your calendar.</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Team Saga opt-out (admin/manager only) */}
        <SagaRecapCard />
        <AvatarCustomizationCard />
        {isManager && <SagaOptOutCard />}

        {/* Sync schedule */}
        {accounts.length > 0 && (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                Sync Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                All connected accounts are polled <strong>every 60 seconds</strong> in the background. New notifications appear automatically in the bell icon. Dashboard banner data loads fresh on each page visit.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}
