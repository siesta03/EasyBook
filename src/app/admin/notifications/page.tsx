"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Bell,
  MessageSquare,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  CheckCheck,
  Search,
  ExternalLink,
  User,
  Shield,
  Loader2,
  Sparkles,
  Settings,
  Phone,
} from "lucide-react";
import { formatMYR, getCategoryBadgeClass } from "@/lib/categories";

interface NotificationItem {
  id: string;
  channel: string;
  recipient: string;
  recipientRole: string;
  eventType: string;
  message: string;
  status: string;
  isRead: boolean;
  metadata: string | null;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unreadCount: number;
  whatsappCount: number;
  calendarCount: number;
  adminAlertsCount: number;
  customerAlertsCount: number;
  sentCount: number;
  simulatedCount: number;
  failedCount: number;
}

interface RecentBookingItem {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  startTime: string;
  totalAmount: string | number;
  status: string;
  service: {
    name: string;
    category: string;
  };
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unreadCount: 0,
    whatsappCount: 0,
    calendarCount: 0,
    adminAlertsCount: 0,
    customerAlertsCount: 0,
    sentCount: 0,
    simulatedCount: 0,
    failedCount: 0,
  });
  const [whatsappConfig, setWhatsappConfig] = useState<{
    whatsappNumber: string;
    whatsappEnabled: boolean;
    whatsappNotifyOnCheckout: boolean;
    whatsappNotifyOnConfirm: boolean;
    whatsappNotifyCustomer: boolean;
    whatsappProvider: string;
    hasApiKey: boolean;
  } | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Dispatch Drawer State
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [dispatchRole, setDispatchRole] = useState<"BOTH" | "CUSTOMER" | "ADMIN">("BOTH");
  const [dispatchEvent, setDispatchEvent] = useState<
    "BOOKING_CONFIRMED" | "BOOKING_CREATED" | "BOOKING_RESCHEDULED"
  >("BOOKING_CONFIRMED");
  const [isDispatching, setIsDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    directUrl?: string;
  } | null>(null);

  const loadNotifications = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.set("recipientRole", roleFilter);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      if (eventFilter !== "ALL") params.set("eventType", eventFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (data.stats) setStats(data.stats);
        if (data.whatsappConfig) setWhatsappConfig(data.whatsappConfig);
        if (data.recentBookings) {
          setRecentBookings(data.recentBookings);
          if (!selectedBookingId && data.recentBookings.length > 0) {
            setSelectedBookingId(data.recentBookings[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchFilteredNotifications() {
      try {
        const params = new URLSearchParams();
        if (roleFilter !== "ALL") params.set("recipientRole", roleFilter);
        if (channelFilter !== "ALL") params.set("channel", channelFilter);
        if (eventFilter !== "ALL") params.set("eventType", eventFilter);
        if (searchQuery.trim()) params.set("q", searchQuery.trim());

        const res = await fetch(`/api/admin/notifications?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setNotifications(data.notifications || []);
            if (data.stats) setStats(data.stats);
            if (data.whatsappConfig) setWhatsappConfig(data.whatsappConfig);
            if (data.recentBookings) {
              setRecentBookings(data.recentBookings);
              if (data.recentBookings.length > 0) {
                setSelectedBookingId((prev) => prev || data.recentBookings[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    fetchFilteredNotifications();
    return () => {
      ignore = true;
    };
  }, [roleFilter, channelFilter, eventFilter, searchQuery]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setStats((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setStats((prev) => ({ ...prev, unreadCount: 0 }));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications?id=${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      loadNotifications(true);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all notification logs?")) return;
    try {
      await fetch("/api/admin/notifications?clearAll=true", {
        method: "DELETE",
      });
      setNotifications([]);
      loadNotifications(true);
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  const handleSendBookingWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) return;
    setIsDispatching(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_booking_alert",
          bookingId: selectedBookingId,
          recipientRole: dispatchRole,
          eventType: dispatchEvent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch WhatsApp alert");

      setFeedback({
        type: "success",
        text:
          dispatchRole === "BOTH"
            ? "WhatsApp alerts dispatched to both Customer and Admin!"
            : `WhatsApp alert dispatched to ${dispatchRole}!`,
        directUrl: data.directUrl,
      });
      loadNotifications(true);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch alert",
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const parseMeta = (metaStr: string | null) => {
    if (!metaStr) return null;
    try {
      return JSON.parse(metaStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Bell className="w-7 h-7 text-indigo-400" />
            Notification Center
            {stats.unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {stats.unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor and dispatch real-time WhatsApp booking alerts for both Customers and Studio Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
          <button
            type="button"
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-300 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Unread Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.unreadCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats.total} total notifications recorded
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Admin WhatsApp Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.adminAlertsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Alerts when bookings are received
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Customer WhatsApp Alerts
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{stats.customerAlertsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Confirmations sent to customers
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Gateway Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-white">
              {whatsappConfig?.hasApiKey ? "Live API Active" : "1-Click / Sim Mode"}
            </span>
          </div>
          <Link
            href="/admin/profile"
            className="text-[11px] text-indigo-400 hover:underline mt-1 inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            Configure Gateway ({whatsappConfig?.whatsappProvider || "callmebot"})
          </Link>
        </div>
      </div>

      {/* Quick Booking WhatsApp Dispatcher Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-indigo-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Instant Booking WhatsApp Dispatcher (Customer &amp; Admin)
              </h2>
              <p className="text-xs text-slate-400">
                Manually trigger or re-send formatted WhatsApp notifications (in RM) to the customer, admin, or both.
              </p>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            {feedback.directUrl && (
              <a
                href={feedback.directUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Open in WhatsApp
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <form
          onSubmit={handleSendBookingWhatsApp}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Select Booking
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="w-full bg-[#10131e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {recentBookings.length === 0 ? (
                <option value="">No bookings available yet</option>
              ) : (
                recentBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.clientName} ({b.clientPhone}) — [{b.service?.category || "Photoshoot"}]{" "}
                    {b.service?.name} ({formatMYR(b.totalAmount)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Recipient
            </label>
            <select
              value={dispatchRole}
              onChange={(e) =>
                setDispatchRole(e.target.value as "BOTH" | "CUSTOMER" | "ADMIN")
              }
              className="w-full bg-[#10131e] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="BOTH">Both Customer &amp; Admin</option>
              <option value="CUSTOMER">Customer Only (Client Phone)</option>
              <option value="ADMIN">Admin Only (Studio Phone)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Template
            </label>
            <select
              value={dispatchEvent}
              onChange={(e) =>
                setDispatchEvent(
                  e.target.value as
                    | "BOOKING_CONFIRMED"
                    | "BOOKING_CREATED"
                    | "BOOKING_RESCHEDULED"
                )
              }
              className="w-full bg-[#10131e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="BOOKING_CONFIRMED">Booking Confirmed</option>
              <option value="BOOKING_CREATED">New Booking Hold</option>
              <option value="BOOKING_RESCHEDULED">Rescheduled</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={!selectedBookingId || isDispatching}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Alert
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Filters & Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications by phone number, client name, package, or message..."
            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Role Filter */}
          {(["ALL", "ADMIN", "CUSTOMER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                roleFilter === r
                  ? "bg-indigo-600 text-white"
                  : "bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {r === "ALL"
                ? "All Recipients"
                : r === "ADMIN"
                ? "Admin Alerts"
                : "Customer Alerts"}
            </button>
          ))}

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-[#121521] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            <option value="ALL">All Channels</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="GOOGLE_CALENDAR">Google Calendar</option>
          </select>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-[#121521] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200"
          >
            <option value="ALL">All Events</option>
            <option value="BOOKING_CREATED">New Booking Hold</option>
            <option value="BOOKING_CONFIRMED">Booking Confirmed</option>
            <option value="BOOKING_RESCHEDULED">Booking Rescheduled</option>
            <option value="BOOKING_CANCELLED">Booking Cancelled</option>
            <option value="TEST">Test Alerts</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3 glass-panel rounded-3xl border border-white/10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs">Loading notification activity...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 glass-panel rounded-3xl border border-white/10 p-8">
            <Bell className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-50" />
            <p className="text-base font-bold text-white">No notifications found</p>
            <p className="text-xs text-slate-500 mt-1">
              When a customer books a photoshoot or when you send a WhatsApp alert above, notifications will appear here in real time.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = parseMeta(n.metadata);
            const directUrl =
              meta?.directUrl ||
              (n.channel === "WHATSAPP"
                ? `https://wa.me/${n.recipient.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    n.message
                  )}`
                : null);

            return (
              <div
                key={n.id}
                className={`glass-panel p-5 rounded-2xl border transition-all ${
                  !n.isRead
                    ? "border-indigo-500/40 bg-indigo-950/15 shadow-lg shadow-indigo-500/5"
                    : "border-white/10 bg-white/[0.01]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      )}

                      {/* Channel Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          n.channel === "WHATSAPP"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        }`}
                      >
                        {n.channel === "WHATSAPP" ? (
                          <MessageSquare className="w-3 h-3" />
                        ) : (
                          <Calendar className="w-3 h-3" />
                        )}
                        {n.channel}
                      </span>

                      {/* Recipient Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          n.recipientRole === "CUSTOMER"
                            ? "bg-pink-500/15 text-pink-300 border-pink-500/30"
                            : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                        }`}
                      >
                        {n.recipientRole === "CUSTOMER" ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {n.recipientRole === "CUSTOMER"
                          ? "TO CUSTOMER"
                          : "TO ADMIN"}
                      </span>

                      {/* Event Type */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                        {n.eventType.replace(/_/g, " ")}
                      </span>

                      {/* Category Badge if present */}
                      {meta?.category && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                            meta.category
                          )}`}
                        >
                          {meta.category}
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.status === "SENT"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : n.status === "SIMULATED"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {n.status === "SENT"
                          ? "LIVE SENT"
                          : n.status === "SIMULATED"
                          ? "READY FOR 1-CLICK WHATSAPP"
                          : "FAILED"}
                      </span>

                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(n.createdAt), "dd MMM yyyy, hh:mm:ss a")}
                      </span>
                    </div>

                    {/* Recipient Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1 font-mono text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Recipient: +{n.recipient.replace(/^\+/, "")}
                      </span>
                      {meta?.clientName && (
                        <span className="text-slate-400">
                          • Client: <strong className="text-white">{meta.clientName}</strong>
                        </span>
                      )}
                      {meta?.totalAmount && (
                        <span className="text-emerald-300 font-bold">
                          • {formatMYR(meta.totalAmount)}
                        </span>
                      )}
                    </div>

                    {/* Message Body Box */}
                    <pre className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {n.message}
                    </pre>

                    {meta?.deliveryNote && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        {meta.deliveryNote}
                      </p>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    {directUrl && (
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!n.isRead) handleMarkRead(n.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send via WhatsApp
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 cursor-pointer"
                      >
                        Mark as Read
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

