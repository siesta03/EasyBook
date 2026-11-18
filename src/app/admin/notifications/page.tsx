"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Bell,
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
  Settings,
  Mail,
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
  telegramCount?: number;
  emailCount?: number;
  calendarCount: number;
  adminAlertsCount: number;
  customerAlertsCount: number;
  sentCount: number;
  simulatedCount: number;
  failedCount: number;
}

interface RecentBookingItem {
  id: string;
  manageToken?: string;
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
    telegramCount: 0,
    emailCount: 0,
    calendarCount: 0,
    adminAlertsCount: 0,
    customerAlertsCount: 0,
    sentCount: 0,
    simulatedCount: 0,
    failedCount: 0,
  });
  const [alertChannels, setAlertChannels] = useState<{
    telegramEnabled: boolean;
    telegramConfigured: boolean;
    emailConfigured: boolean;
    emailNotifyCustomer: boolean;
  } | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Manual Dispatcher State
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [dispatchRole, setDispatchRole] = useState<"BOTH" | "CUSTOMER" | "ADMIN">("BOTH");
  const [dispatchEvent, setDispatchEvent] = useState<
    "BOOKING_CONFIRMED" | "BOOKING_CREATED" | "BOOKING_RESCHEDULED"
  >("BOOKING_CONFIRMED");
  const [isDispatching, setIsDispatching] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    invitationUrl?: string;
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
        if (data.alertChannels) setAlertChannels(data.alertChannels);
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
            if (data.alertChannels) setAlertChannels(data.alertChannels);
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

  const handleSendBookingNotification = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.error || "Failed to dispatch notification");

      setFeedback({
        type: "success",
        text:
          dispatchRole === "BOTH"
            ? "Telegram Admin alert and Customer Token-Based Invitation email dispatched!"
            : dispatchRole === "ADMIN"
            ? "Admin Telegram bot alert dispatched!"
            : "Customer Token-Based Confirmation Email dispatched!",
        invitationUrl: data.invitationUrl,
      });
      loadNotifications(true);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch notification",
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] tracking-tight flex items-center gap-2.5">
            <span>Notifications</span>
            {stats.unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#cc0000] text-white">
                {stats.unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            Monitor Admin Telegram bot alerts and Customer Token-Based Email invitations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stats.unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#f1f1f1] text-xs font-medium transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#aaaaaa]" />
              Mark All Read
            </button>
          )}
          <button
            type="button"
            onClick={() => loadNotifications(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#f1f1f1] text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#aaaaaa] ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#521c1c] bg-[#2e1414] hover:bg-[#3e1b1b] text-[#f87171] text-xs font-medium transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
              Unread Alerts
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#272727] text-[#ff4e4e] flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#f1f1f1]">{stats.unreadCount}</div>
          <p className="text-[11px] text-[#717171] mt-1">
            {stats.total} total notifications recorded
          </p>
        </div>

        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
              Admin Telegram Alerts
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#272727] text-[#38bdf8] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#f1f1f1]">
            {stats.telegramCount ?? stats.adminAlertsCount}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">
            Instant alerts via Telegram Bot
          </p>
        </div>

        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
              Customer Email Invites
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#272727] text-[#f472b6] flex items-center justify-center">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#f1f1f1]">
            {stats.emailCount ?? stats.customerAlertsCount}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">
            Token-based confirmation emails
          </p>
        </div>

        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
              Active Channels
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#272727] text-[#38bdf8] flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  alertChannels?.telegramConfigured ? "bg-[#4ade80]" : "bg-[#facc15]"
                }`}
              />
              <span className="text-xs font-semibold text-[#f1f1f1]">
                Telegram: {alertChannels?.telegramConfigured ? "Connected" : "Setup Needed"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  alertChannels?.emailNotifyCustomer ? "bg-[#4ade80]" : "bg-[#717171]"
                }`}
              />
              <span className="text-xs font-semibold text-[#aaaaaa]">
                Customer Email:{" "}
                {alertChannels?.emailNotifyCustomer ? "Token Invite Active" : "Disabled"}
              </span>
            </div>
          </div>
          <Link
            href="/admin/profile?tab=alerts"
            className="text-[11px] text-[#3ea6ff] hover:underline mt-2 inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" />
            Configure Bot &amp; Email
          </Link>
        </div>
      </div>

      {/* Manual Notification Dispatcher Card (Telegram & Email) */}
      <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-[#2a2a2a] space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#272727] text-[#38bdf8] flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#f1f1f1]">
              Manual Notification Dispatcher (Telegram &amp; Email)
            </h2>
            <p className="text-xs text-[#aaaaaa]">
              Trigger an Admin Telegram bot alert or send a Customer Token-Based Confirmation Email.
            </p>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
              feedback.type === "success"
                ? "bg-[#0e2a1b] border-[#164e2d] text-[#86efac]"
                : "bg-[#2e1414] border-[#521c1c] text-[#fca5a5]"
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
            {feedback.invitationUrl && (
              <Link
                href={feedback.invitationUrl}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold whitespace-nowrap"
              >
                Open Customer Booking Page
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}

        <form
          onSubmit={handleSendBookingNotification}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
              Select Booking
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => setSelectedBookingId(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff]"
            >
              {recentBookings.length === 0 ? (
                <option value="">No bookings available yet</option>
              ) : (
                recentBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.clientName} ({b.clientEmail}) — [{b.service?.category || "Photoshoot"}]{" "}
                    {b.service?.name} ({formatMYR(b.totalAmount)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
              Recipient
            </label>
            <select
              value={dispatchRole}
              onChange={(e) =>
                setDispatchRole(e.target.value as "BOTH" | "CUSTOMER" | "ADMIN")
              }
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff]"
            >
              <option value="BOTH">Both (Admin Telegram + Customer Email)</option>
              <option value="ADMIN">Admin Only (Telegram Bot)</option>
              <option value="CUSTOMER">Customer Only (Token Confirmation Email)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
              Event
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
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff]"
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
              className="w-full py-2.5 px-4 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
      <div className="bg-[#1a1a1a] p-3.5 rounded-2xl border border-[#2a2a2a] flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#717171] absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipient, client name, package, or message..."
            className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#2a2a2a] rounded-full text-xs text-[#f1f1f1] placeholder-[#717171] focus:outline-none focus:border-[#3ea6ff]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {(["ALL", "ADMIN", "CUSTOMER"] as const).map((r) => {
            const active = roleFilter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#f1f1f1] text-[#0f0f0f] font-semibold"
                    : "bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#333333]"
                }`}
              >
                {r === "ALL" ? "All" : r === "ADMIN" ? "Admin" : "Customer"}
              </button>
            );
          })}

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-[#121212] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs font-medium text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff]"
          >
            <option value="ALL">All Channels</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="EMAIL">Email</option>
          </select>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-[#121212] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-xs font-medium text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff]"
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
          <div className="py-20 flex flex-col items-center justify-center text-[#aaaaaa] gap-2 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a]">
            <Loader2 className="w-6 h-6 animate-spin text-[#aaaaaa]" />
            <p className="text-xs">Loading activity...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-[#717171] bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8">
            <Bell className="w-9 h-9 text-[#717171] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-[#aaaaaa]">No notifications found</p>
            <p className="text-xs text-[#717171] mt-0.5">
              When bookings are made or alerts dispatched, they appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = parseMeta(n.metadata);
            const invitationPath = meta?.manageToken
              ? `/booking/manage/${meta.manageToken}`
              : meta?.invitationUrl || null;

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-colors ${
                  !n.isRead
                    ? "border-[#383838] bg-[#222222]"
                    : "border-[#2a2a2a] bg-[#1a1a1a]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#cc0000]" />
                      )}

                      {/* Channel Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          n.channel === "TELEGRAM"
                            ? "bg-[#142330] text-[#38bdf8] border-[#1d3d57]"
                            : n.channel === "EMAIL"
                            ? "bg-[#2e1823] text-[#f472b6] border-[#4c2236]"
                            : "bg-[#272727] text-[#aaaaaa] border-[#383838]"
                        }`}
                      >
                        {n.channel === "TELEGRAM" ? (
                          <Send className="w-3 h-3" />
                        ) : n.channel === "EMAIL" ? (
                          <Mail className="w-3 h-3" />
                        ) : (
                          <Calendar className="w-3 h-3" />
                        )}
                        {n.channel}
                      </span>

                      {/* Recipient Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          n.recipientRole === "CUSTOMER"
                            ? "bg-[#2e1823] text-[#f472b6] border-[#4c2236]"
                            : "bg-[#272727] text-[#f1f1f1] border-[#383838]"
                        }`}
                      >
                        {n.recipientRole === "CUSTOMER" ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <Shield className="w-3 h-3" />
                        )}
                        {n.recipientRole === "CUSTOMER" ? "TO CUSTOMER" : "TO ADMIN"}
                      </span>

                      {/* Event Type */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#121212] text-[#aaaaaa] border border-[#2a2a2a]">
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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          n.status === "SENT"
                            ? "bg-[#0e2a1b] text-[#4ade80]"
                            : n.status === "SIMULATED"
                            ? "bg-[#2a220e] text-[#facc15]"
                            : "bg-[#2e1414] text-[#f87171]"
                        }`}
                      >
                        {n.status}
                      </span>

                      <span className="text-[11px] text-[#717171] font-mono flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(n.createdAt), "dd MMM yyyy, hh:mm:ss a")}
                      </span>
                    </div>

                    {/* Recipient Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#aaaaaa]">
                      <span className="font-mono text-[#f1f1f1]">
                        Recipient: {n.recipient}
                      </span>
                      {meta?.clientName && (
                        <span>
                          • Client: <strong className="text-[#f1f1f1]">{meta.clientName}</strong>
                        </span>
                      )}
                      {meta?.totalAmount && (
                        <span className="text-[#4ade80] font-semibold">
                          • {formatMYR(meta.totalAmount)}
                        </span>
                      )}
                    </div>

                    {/* Message Body Box */}
                    <pre className="p-3.5 rounded-xl bg-[#121212] border border-[#2a2a2a] text-xs text-[#e5e5e5] whitespace-pre-wrap font-sans leading-relaxed">
                      {n.message}
                    </pre>

                    {meta?.deliveryNote && (
                      <p className="text-[11px] text-[#aaaaaa] flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#717171]" />
                        {meta.deliveryNote}
                      </p>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex sm:flex-col items-end gap-2 shrink-0">
                    {invitationPath && (
                      <Link
                        href={invitationPath}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#272727] hover:bg-[#333333] text-[#f1f1f1] text-xs font-medium border border-[#383838] transition"
                      >
                        <span>Open Booking Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="px-3 py-1.5 rounded-full bg-[#272727] hover:bg-[#333333] text-[#aaaaaa] hover:text-[#f1f1f1] text-xs font-medium border border-[#383838] cursor-pointer"
                      >
                        Mark as Read
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 rounded-lg text-[#717171] hover:text-[#f87171] hover:bg-[#2e1414] transition cursor-pointer"
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
