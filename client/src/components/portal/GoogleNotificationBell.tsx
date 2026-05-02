import { useState, useEffect, useRef } from "react";
import { Bell, Mail, Calendar, X, ExternalLink } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/auth";

interface GNotification {
  id: number;
  type: "gmail" | "calendar";
  title: string;
  subtitle: string | null;
  url: string;
  is_read: boolean;
  event_time: string | null;
  created_at: string;
}

export function GoogleNotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: statusData } = useQuery({
    queryKey: ["/api/google/status"],
    queryFn: () => apiRequest("GET", "/api/google/status"),
    staleTime: 60_000,
  });

  const connected = statusData?.data?.connected;

  const { data } = useQuery({
    queryKey: ["/api/google/notifications"],
    queryFn: () => apiRequest("GET", "/api/google/notifications"),
    refetchInterval: 30_000,
    enabled: !!connected,
  });

  const notifications: GNotification[] = data?.data?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("POST", "/api/google/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/google/notifications"] }),
  });

  const markRead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/google/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/google/notifications"] }),
  });

  const dismiss = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/google/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/google/notifications"] }),
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!connected) return null;

  function handleNotifClick(n: GNotification) {
    window.open(n.url, "_blank", "noopener,noreferrer");
    markRead.mutate(n.id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="button-google-notification-bell"
        aria-label={`Google notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5 text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#D4A843] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-sm text-slate-800">
              Google Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#D4A843]/15 text-[#b8892e] text-xs rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-[#0D7377] hover:underline"
                data-testid="button-mark-all-read"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
                <p className="text-xs text-slate-300 mt-1">Updates arrive every 60 seconds</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group ${!n.is_read ? "bg-teal-50/40" : ""}`}
                  data-testid={`notif-item-${n.id}`}
                >
                  <div
                    className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      n.type === "gmail" ? "bg-red-100" : "bg-blue-100"
                    }`}
                  >
                    {n.type === "gmail" ? (
                      <Mail className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleNotifClick(n)}
                  >
                    <p
                      className={`text-sm truncate ${
                        !n.is_read ? "font-semibold text-slate-800" : "text-slate-600"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.subtitle && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{n.subtitle}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={() => handleNotifClick(n)}
                      className="p-1 rounded text-slate-300 hover:text-[#0D7377] hover:bg-teal-50"
                      title="Open in Google"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss.mutate(n.id); }}
                      className="p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50"
                      title="Dismiss"
                      data-testid={`button-dismiss-notif-${n.id}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">Syncs every 60 s</p>
            <a
              href="/portal/employee/settings"
              className="text-xs text-[#0D7377] hover:underline"
              onClick={() => setOpen(false)}
            >
              Manage
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
