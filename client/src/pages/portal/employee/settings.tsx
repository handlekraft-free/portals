import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { EmployeeLayout } from "@/components/portal/EmployeeLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Mail, Calendar, CheckCircle2, AlertCircle, Loader2, LogOut, ExternalLink, RefreshCw } from "lucide-react";

export default function EmployeeSettings() {
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/google/status"],
    queryFn: () => apiRequest("GET", "/api/google/status"),
  });

  const connected: boolean = statusData?.data?.connected ?? false;
  const googleEmail: string | null = statusData?.data?.email ?? null;

  const { data: notifsData } = useQuery({
    queryKey: ["/api/google/notifications"],
    queryFn: () => apiRequest("GET", "/api/google/notifications"),
    enabled: connected,
  });
  const notifCount: number = notifsData?.data?.notifications?.length ?? 0;

  const getOAuthUrl = useMutation({
    mutationFn: () => apiRequest("GET", "/api/google/oauth/url"),
    onSuccess: (data) => {
      if (data?.data?.url) window.location.href = data.data.url;
    },
    onError: () => toast({ title: "Error", description: "Could not start Google sign-in.", variant: "destructive" }),
  });

  const disconnect = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/google/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/google/notifications"] });
      toast({ title: "Google account disconnected" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "connected") {
      toast({ title: "Google account connected!", description: "Gmail and Calendar notifications are now active." });
      refetchStatus();
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
                  <CardTitle className="text-base">Google Account</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Gmail + Google Calendar notifications</CardDescription>
                </div>
              </div>
              {statusLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : connected ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 text-xs">
                  Not connected
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {connected ? (
              <>
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Gmail unread messages appear as notifications in the top bar</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Calendar events within 24 hours appear as reminders</span>
                  </div>
                  {googleEmail && (
                    <div className="pt-1 border-t border-slate-200 text-xs text-slate-400">
                      Connected as <span className="font-medium text-slate-600">{googleEmail}</span>
                    </div>
                  )}
                  {notifCount > 0 && (
                    <div className="text-xs text-slate-400">
                      {notifCount} cached notification{notifCount !== 1 ? "s" : ""} in your feed
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-200"
                    onClick={() => window.open("https://mail.google.com", "_blank", "noopener,noreferrer")}
                    data-testid="button-open-gmail"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Gmail
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-200"
                    onClick={() => window.open("https://calendar.google.com", "_blank", "noopener,noreferrer")}
                    data-testid="button-open-calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                    onClick={() => disconnect.mutate()}
                    disabled={disconnect.isPending}
                    data-testid="button-disconnect-google"
                  >
                    {disconnect.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Connect your Google account to receive Gmail and Google Calendar reminders directly in your dashboard notification bell.
                </p>
                <div className="rounded-lg bg-slate-50 border border-dashed border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">What you'll get</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Unread Gmail messages from your inbox</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Upcoming calendar events in the next 24 hours</span>
                  </div>
                </div>
                <Button
                  className="bg-[#0D7377] hover:bg-[#0a5f62] text-white w-full sm:w-auto"
                  onClick={() => getOAuthUrl.mutate()}
                  disabled={getOAuthUrl.isPending}
                  data-testid="button-connect-google"
                >
                  {getOAuthUrl.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Connect Google Account
                </Button>
                <p className="text-xs text-slate-400 mt-1">
                  Read-only access — handləkraft cannot send emails or modify your calendar.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification sync info */}
        {connected && (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-400" />
                Sync Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                Gmail and Calendar are polled <strong>every 60 seconds</strong> in the background. New notifications appear automatically in the bell icon at the top of the page. Notifications stay until dismissed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </EmployeeLayout>
  );
}
