"use client";

import * as React from "react";
import { PageHeader, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import {
  Bell,
  Megaphone,
  Send,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDateTime } from "@/lib/types";

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  targetRole?: string | null;
  userId?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
  user?: { name: string; email: string; role: string } | null;
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = React.useState<NotificationRecord[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState("INFO");
  const [targetRole, setTargetRole] = React.useState("ALL");
  const [link, setLink] = React.useState("");

  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotalCount(data.totalCount || 0);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      toast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return toast("Title and message are required", "error");
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          targetRole: targetRole === "ALL" ? null : targetRole,
          link: link.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return toast(data.error || "Failed to broadcast notification", "error");
      }

      toast("Notification broadcast successfully!", "success");
      setTitle("");
      setMessage("");
      setLink("");
      loadNotifications();
    } catch {
      toast("Error dispatching notification", "error");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      toast("Notification removed", "info");
      loadNotifications();
    } catch {
      toast("Failed to delete notification", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Broadcast Desk"
        description="Dispatch real-time platform updates, alerts, and system notices to users and resellers"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00df82]/15 text-[#00df82] flex items-center justify-center">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{totalCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Notifications Sent</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{unreadCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Unread by Recipients</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00df82]/15 text-[#00df82] flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-[#00df82] font-mono">Real-time</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">In-App Push Active</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Broadcast Form (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Send className="h-4 w-4 text-[#00df82]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Compose Broadcast
            </h3>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300">Notification Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. MTN Network Notice or Promo Alert"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300">Severity / Type</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00df82]"
                >
                  <option value="INFO">Information (Blue)</option>
                  <option value="SUCCESS">Success (Emerald)</option>
                  <option value="WARNING">Warning (Amber)</option>
                  <option value="DANGER">Critical / Alert (Rose)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 dark:text-slate-300">Recipient Audience</Label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00df82]"
                >
                  <option value="ALL">All Users & Resellers</option>
                  <option value="RESELLER">Resellers Only</option>
                  <option value="USER">Standard Users Only</option>
                  <option value="ADMIN">Admins Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300">Action Link (Optional URL)</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/dashboard/billing or /dashboard/packages"
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 dark:text-slate-300">Message Body</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type the announcement details here..."
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-[#00df82] to-[#00b568] hover:from-[#00f58f] hover:to-[#00c873] text-slate-950 font-black h-10 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#00df82]/20 cursor-pointer"
            >
              {sending ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Dispatching Broadcast...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Broadcast Now</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Recent Broadcasts List (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#162740] bg-white dark:bg-[#0b1322] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#00df82]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Recent Broadcasts &amp; Alerts
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {notifications.length} logged
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner className="h-6 w-6 text-[#00df82]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No notifications dispatched yet. Use the form to send your first announcement.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs space-y-2 hover:border-[#00df82]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          n.type === "SUCCESS"
                            ? "bg-emerald-400"
                            : n.type === "WARNING"
                            ? "bg-amber-400"
                            : n.type === "DANGER"
                            ? "bg-rose-400"
                            : "bg-blue-400"
                        }`}
                      />
                      <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        {n.targetRole ? `AUDIENCE: ${n.targetRole}` : "BROADCAST: ALL"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDateTime(n.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">{n.message}</p>

                  {n.link && (
                    <div className="pt-1">
                      <span className="text-[10px] text-[#00df82] font-mono flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span>Link: {n.link}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
