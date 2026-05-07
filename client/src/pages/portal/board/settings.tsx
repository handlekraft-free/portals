import { useEffect, useState } from "react";
import { BoardLayout } from "@/components/portal/BoardLayout";
import { PortalGuard } from "@/components/portal/PortalGuard";
import { apiRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Settings, Save, Users, Calendar, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@shared/branding";

function BoardSettingsContent() {
  const [settings, setSettings] = useState<any>({ quorumDefault: 3 });
  const [prefs, setPrefs] = useState<any>({
    meetingNoticesInApp: true,
    meetingNoticesEmail: true,
    actionItemsInApp: true,
    actionItemsEmail: false,
    documentUploadsInApp: true,
    documentUploadsEmail: false,
    forumActivityInApp: true,
    forumActivityEmail: false,
    coiPromptsInApp: true,
    coiPromptsEmail: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "board";

  useEffect(() => {
    document.title = `Board Settings | ${BRAND.fullName}`;
    Promise.all([
      apiRequest("GET", "/api/board/settings"),
      apiRequest("GET", "/api/board/notification-prefs"),
    ]).then(([s, p]) => {
      if (s.success && s.data) setSettings(s.data);
      if (p.success && p.data) setPrefs((prev: any) => ({ ...prev, ...p.data }));
      setLoading(false);
    });
  }, []);

  async function saveGovernance() {
    setSaving(true);
    await apiRequest("PATCH", "/api/board/settings", settings);
    toast({ title: "Saved", description: "Governance settings updated." });
    setSaving(false);
  }

  async function savePrefs() {
    setSaving(true);
    await apiRequest("PATCH", "/api/board/notification-prefs", prefs);
    toast({ title: "Saved", description: "Notification preferences updated." });
    setSaving(false);
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display text-[#1A1F2B] flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" /> Board Settings
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure governance parameters and your personal notification preferences.</p>
      </div>

      {isAdmin && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" /> Governance Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Default Quorum (number of members required)</label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.quorumDefault}
                onChange={e => setSettings((s: any) => ({ ...s, quorumDefault: parseInt(e.target.value) }))}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                data-testid="input-quorum"
              />
              <p className="text-xs text-slate-400 mt-1">Meetings will show a quorum progress bar based on this threshold.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Board Size (total voting members)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={settings.boardSize ?? 5}
                onChange={e => setSettings((s: any) => ({ ...s, boardSize: parseInt(e.target.value) }))}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                data-testid="input-board-size"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Meeting Notice Period (days required before meeting)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={settings.noticeDaysRequired ?? 7}
                onChange={e => setSettings((s: any) => ({ ...s, noticeDaysRequired: parseInt(e.target.value) }))}
                className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                data-testid="input-notice-days"
              />
            </div>
            <Button onClick={saveGovernance} disabled={saving} className="bg-indigo-500 text-white gap-2" data-testid="button-save-governance">
              <Save className="w-4 h-4" /> Save Governance Settings
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "meetingNoticesInApp", label: "Meeting notices (in-app)", desc: "In-app alerts for upcoming meetings and RSVPs", icon: Calendar },
            { key: "meetingNoticesEmail", label: "Meeting notices (email)", desc: "Email reminders for upcoming meetings", icon: Calendar },
            { key: "actionItemsInApp", label: "Action item alerts (in-app)", desc: "In-app alerts when action items are due or overdue", icon: Bell },
            { key: "actionItemsEmail", label: "Action item alerts (email)", desc: "Email reminders for due/overdue action items", icon: Bell },
            { key: "documentUploadsInApp", label: "New documents (in-app)", desc: "In-app notification when new board documents are uploaded", icon: Shield },
            { key: "documentUploadsEmail", label: "New documents (email)", desc: "Email notification for new board documents", icon: Shield },
            { key: "forumActivityInApp", label: "Forum activity (in-app)", desc: "In-app alerts for new forum topics and replies", icon: Users },
            { key: "coiPromptsInApp", label: "COI reminders (in-app)", desc: "Annual COI disclosure filing reminders", icon: Settings },
            { key: "coiPromptsEmail", label: "COI reminders (email)", desc: "Email prompts for COI disclosure filing", icon: Settings },
          ].map(({ key, label, desc, icon: Icon }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer py-1" data-testid={`toggle-${key}`}>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!prefs[key]}
                  onChange={e => setPrefs((p: any) => ({ ...p, [key]: e.target.checked }))}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${prefs[key] ? "bg-indigo-500" : "bg-slate-200"}`}
                  onClick={() => setPrefs((p: any) => ({ ...p, [key]: !p[key] }))}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow m-0.5 transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#1A1F2B]">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            </label>
          ))}
          <div className="pt-2">
            <Button onClick={savePrefs} disabled={saving} variant="outline" className="border-indigo-200 text-indigo-600 gap-2 hover:bg-indigo-50" data-testid="button-save-prefs">
              <Save className="w-4 h-4" /> Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm bg-indigo-50/50">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-indigo-700 mb-1">About {BRAND.name} Board Member Portal</p>
          <p className="text-xs text-indigo-600">This portal supports 501(c)(3) governance best practices including quorum tracking, meeting notice compliance, COI disclosures, and written consent procedures.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BoardSettings() {
  return (
    <PortalGuard allowedRoles={["admin", "board"]}>
      <BoardLayout><BoardSettingsContent /></BoardLayout>
    </PortalGuard>
  );
}
