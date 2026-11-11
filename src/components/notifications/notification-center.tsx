"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ClipboardList,
  ExternalLink,
  X,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGHS, type AuthUser } from "@/lib/types";

interface NotificationCenterProps {
  user: AuthUser;
  admin?: boolean;
  announcement?: string | null;
  className?: string;
}

interface ServerNotification {
  id: string;
  userId?: string | null;
  targetRole?: string | null;
  type: string; // "INFO" | "SUCCESS" | "WARNING" | "DANGER" | "SYSTEM"
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationCenter({
  user,
  admin,
  announcement,
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [dbNotifications, setDbNotifications] = React.useState<ServerNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = React.useState<string | null>(announcement ?? null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setCurrentAnnouncement(announcement ?? null);
  }, [announcement]);

  // Fetch real notifications from API
  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDbNotifications(data.notifications || []);
        setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
        if (data.announcement !== undefined) {
          setCurrentAnnouncement(data.announcement);
          window.dispatchEvent(
            new CustomEvent("site-announcement-update", {
              detail: { announcement: data.announcement },
            })
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  // Mark single as read
  const markAsRead = async (id: string) => {
    try {
      setDbNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      // ignore
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      setDbNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // ignore
    }
  };

  // Dismiss / delete notification
  const dismiss = async (id: string) => {
    try {
      setDbNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  };

  // Close when clicking outside or pressing Escape
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Format relative time helper
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open notifications"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 outline-none",
          open
            ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:border-brand-400 dark:text-brand-300"
            : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        )}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-brand-600 dark:text-brand-400 animate-wiggle" />
        ) : (
          <Bell className="h-4 w-4" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs ring-2 ring-white dark:ring-[#070b13] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-[#0c1220] z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Notifications</h3>
                <span className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Platform Announcement Banner if available */}
          {currentAnnouncement && currentAnnouncement.trim() && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Megaphone className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Platform Broadcast
                </div>
                <p className="text-[11px] leading-relaxed mt-0.5">{currentAnnouncement}</p>
              </div>
            </div>
          )}

          {/* Notifications Scroll Area */}
          <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {dbNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto" />
                <p className="font-medium text-slate-600 dark:text-slate-300">No new notifications</p>
                <p className="text-[11px] text-slate-400">You're completely up to date.</p>
              </div>
            ) : (
              dbNotifications.map((n) => {
                const isSuccess = n.type === "SUCCESS";
                const isWarning = n.type === "WARNING";
                const isDanger = n.type === "DANGER";

                return (
                  <div
                    key={n.id}
                    className={cn(
                      "relative rounded-xl border p-3 text-xs transition-all group",
                      !n.read
                        ? "border-brand-500/30 bg-brand-500/5 dark:bg-brand-500/10 dark:border-brand-500/30 font-medium"
                        : "border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/40 opacity-80 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg shadow-xs",
                          isSuccess
                            ? "bg-emerald-600 text-white"
                            : isWarning
                            ? "bg-amber-500 text-slate-950"
                            : isDanger
                            ? "bg-rose-600 text-white"
                            : "bg-brand-600 text-white"
                        )}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : isDanger ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Megaphone className="h-3.5 w-3.5" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between pt-1.5">
                          {n.link ? (
                            <Link
                              href={n.link}
                              onClick={() => {
                                markAsRead(n.id);
                                setOpen(false);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                            >
                              <span>View Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-2">
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(n.id)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => dismiss(n.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                              title="Dismiss"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status */}
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Synced</span>
            </div>
            {admin && (
              <Link
                href="/admin/notifications"
                onClick={() => setOpen(false)}
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
              >
                Broadcast Center →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
