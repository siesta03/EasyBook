"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  getHours,
  differenceInMinutes,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Download,
  RefreshCw,
  Loader2,
  X,
  CalendarPlus,
  Send,
  Layers,
  Sliders,
  FileText,
} from "lucide-react";
import {
  PHOTOSHOOT_CATEGORIES,
  formatMYR,
  getCategoryBadgeClass,
} from "@/lib/categories";

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string | number;
  durationMinutes: number;
  bufferMinutes: number;
}

interface Booking {
  id: string;
  manageToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string | null;
  serviceId: string;
  service: ServicePackage;
  startTime: string;
  endTime: string;
  bufferEndTime: string;
  totalAmount: string | number;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
  calendarEventId?: string | null;
  createdAt: string;
}

interface BlackoutDate {
  id: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
}

type CalendarViewMode = "month" | "week" | "day" | "schedule";

const CATEGORY_EVENT_STYLES: Record<string, string> = {
  "Indoor Photoshoot":
    "bg-indigo-600/25 border-l-4 border-indigo-400 text-indigo-100 hover:bg-indigo-600/40",
  "Outdoor Photoshoot":
    "bg-emerald-600/25 border-l-4 border-emerald-400 text-emerald-100 hover:bg-emerald-600/40",
  Wedding:
    "bg-pink-600/25 border-l-4 border-pink-400 text-pink-100 hover:bg-pink-600/40",
  Sport:
    "bg-amber-600/25 border-l-4 border-amber-400 text-amber-100 hover:bg-amber-600/40",
  Product:
    "bg-cyan-600/25 border-l-4 border-cyan-400 text-cyan-100 hover:bg-cyan-600/40",
};

function AdminCalendarView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calendar view state
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE"); // ACTIVE = CONFIRMED + PENDING_PAYMENT

  // Selected Booking for Google Calendar-like Details Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDateTime, setNewDateTime] = useState("");
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    type: "success" | "error";
    text: string;
    directUrl?: string;
  } | null>(null);

  const loadCalendarData = async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [bookingsRes, availRes] = await Promise.all([
        fetch("/api/admin/bookings"),
        fetch("/api/admin/availability"),
      ]);

      if (bookingsRes.ok) {
        const bData: Booking[] = await bookingsRes.json();
        setBookings(bData);
        if (selectedBooking) {
          const refreshed = bData.find((item) => item.id === selectedBooking.id);
          if (refreshed) setSelectedBooking(refreshed);
        }
      }
      if (availRes.ok) {
        const aData = await availRes.json();
        setBlackouts(aData.blackoutDates || []);
      }
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function initCalendar() {
      try {
        const [bookingsRes, availRes] = await Promise.all([
          fetch("/api/admin/bookings"),
          fetch("/api/admin/availability"),
        ]);
        if (bookingsRes.ok) {
          const bData: Booking[] = await bookingsRes.json();
          if (!ignore) setBookings(bData);
        }
        if (availRes.ok) {
          const aData = await availRes.json();
          if (!ignore) setBlackouts(aData.blackoutDates || []);
        }
      } catch (err) {
        console.error("Failed to load calendar data:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    initCalendar();
    return () => {
      ignore = true;
    };
  }, []);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter === "ACTIVE") {
        if (b.status !== "CONFIRMED" && b.status !== "PENDING_PAYMENT") return false;
      } else if (statusFilter !== "ALL") {
        if (b.status !== statusFilter) return false;
      }

      if (categoryFilter !== "ALL") {
        const cat = b.service?.category || "Indoor Photoshoot";
        if (cat !== categoryFilter) return false;
      }

      return true;
    });
  }, [bookings, statusFilter, categoryFilter]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const handleNext = () => {
    if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Compute grid days for Month & Week views
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getBookingsForDay = (day: Date) => {
    return filteredBookings
      .filter((b) => isSameDay(parseISO(b.startTime), day))
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
  };

  const getBlackoutsForDay = (day: Date) => {
    return blackouts.filter((bl) => {
      const s = parseISO(bl.startTime);
      const e = parseISO(bl.endTime);
      return isSameDay(s, day) || isSameDay(e, day) || (s < day && e > day);
    });
  };

  // Open booking detail modal
  const openBookingModal = (b: Booking) => {
    setSelectedBooking(b);
    setRescheduleMode(false);
    setModalFeedback(null);
    const dt = new Date(b.startTime);
    const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNewDateTime(localStr);
  };

  // Confirm or Cancel Booking from Calendar Modal
  const handleStatusUpdate = async (
    bookingId: string,
    status: "CONFIRMED" | "CANCELLED"
  ) => {
    setIsUpdatingBooking(true);
    setModalFeedback(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setBookings((prev) =>
        prev.map((item) => (item.id === bookingId ? data.booking : item))
      );
      setSelectedBooking(data.booking);
      setModalFeedback({
        type: "success",
        text: `Booking status updated to ${status} and WhatsApp notifications dispatched!`,
      });
    } catch (err) {
      setModalFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update booking",
      });
    } finally {
      setIsUpdatingBooking(false);
    }
  };

  // Reschedule Booking from Calendar Modal
  const handleReschedule = async () => {
    if (!selectedBooking || !newDateTime) return;
    setIsUpdatingBooking(true);
    setModalFeedback(null);
    try {
      const isoString = new Date(newDateTime).toISOString();
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          startTime: isoString,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reschedule failed");

      setBookings((prev) =>
        prev.map((item) => (item.id === selectedBooking.id ? data.booking : item))
      );
      setSelectedBooking(data.booking);
      setRescheduleMode(false);
      setModalFeedback({
        type: "success",
        text: "Session rescheduled & updated on calendar and WhatsApp!",
      });
    } catch (err) {
      setModalFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Reschedule failed",
      });
    } finally {
      setIsUpdatingBooking(false);
    }
  };

  // Send WhatsApp Notification to both Customer and Admin for selected booking
  const handleDispatchWhatsApp = async (role: "BOTH" | "CUSTOMER" | "ADMIN") => {
    if (!selectedBooking) return;
    setIsSendingWhatsApp(true);
    setModalFeedback(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_booking_alert",
          bookingId: selectedBooking.id,
          recipientRole: role,
          eventType:
            selectedBooking.status === "CONFIRMED"
              ? "BOOKING_CONFIRMED"
              : "BOOKING_CREATED",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send WhatsApp");

      setModalFeedback({
        type: "success",
        text:
          role === "BOTH"
            ? "WhatsApp notification sent & logged for both Customer and Admin!"
            : `WhatsApp notification dispatched to ${role}!`,
        directUrl: data.directUrl,
      });
    } catch (err) {
      setModalFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to dispatch WhatsApp notification",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const hoursRange = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00

  return (
    <div className="space-y-6">
      {/* Top Google Calendar-Style Toolbar */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Studio Booking Calendar
            </h1>
            <p className="text-xs text-slate-400">
              Google Calendar view of all photoshoot appointments, categories, buffers &amp; client details
            </p>
          </div>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-4">
            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/10 text-xs font-bold text-white transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm sm:text-lg font-extrabold text-white px-2">
              {viewMode === "month" && format(currentDate, "MMMM yyyy")}
              {viewMode === "week" &&
                `${format(weekDays[0], "dd MMM")} – ${format(
                  weekDays[6],
                  "dd MMM yyyy"
                )}`}
              {viewMode === "day" && format(currentDate, "EEEE, dd MMMM yyyy")}
              {viewMode === "schedule" && "Upcoming Schedule Agenda"}
            </span>
          </div>
        </div>

        {/* Right Controls: Filters + View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#121521] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {PHOTOSHOOT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#121521] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ACTIVE">Active (Confirmed + Hold)</option>
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed Only</option>
            <option value="PENDING_PAYMENT">Pending Hold Only</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* View Mode Switcher (Month / Week / Day / Schedule) */}
          <div className="inline-flex rounded-xl bg-[#121521] p-1 border border-white/10">
            {(
              [
                { id: "month", label: "Month" },
                { id: "week", label: "Week" },
                { id: "day", label: "Day" },
                { id: "schedule", label: "Agenda" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === v.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadCalendarData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh Calendar"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>

          <a
            href="/api/calendar/feed?download=true"
            download="easybook-schedule.ics"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
            title="Download .ics for Google Calendar"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export .ics</span>
          </a>
        </div>
      </div>

      {/* Main Calendar Layout: Left Mini Sidebar + Right Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Mini Month Jump + Category Color Key + Today's Summary */}
        <div className="lg:col-span-3 space-y-5">
          {/* Mini Month Navigator */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white">
                {format(currentDate, "MMMM yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentDate((d) => subMonths(d, 1))}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate((d) => addMonths(d, 1))}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-500 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {monthDays.map((d, idx) => {
                const dayBookings = getBookingsForDay(d);
                const selected = isSameDay(d, currentDate);
                const inMonth = isSameMonth(d, currentDate);
                const todayFlag = isToday(d);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentDate(d);
                      if (viewMode === "month") setViewMode("day");
                    }}
                    className={`h-7 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center relative transition cursor-pointer ${
                      selected
                        ? "bg-indigo-600 text-white shadow"
                        : todayFlag
                        ? "border border-indigo-400 text-indigo-300"
                        : inMonth
                        ? "text-slate-300 hover:bg-white/10"
                        : "text-slate-600"
                    }`}
                  >
                    <span>{format(d, "d")}</span>
                    {dayBookings.length > 0 && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          selected ? "bg-white" : "bg-pink-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photoshoot Category Color Legend */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Categories &amp; Color Key
            </h3>
            <div className="space-y-2 text-xs">
              {PHOTOSHOOT_CATEGORIES.map((cat) => {
                const count = filteredBookings.filter(
                  (b) => (b.service?.category || "Indoor Photoshoot") === cat
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((prev) => (prev === cat ? "ALL" : cat))
                    }
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                      categoryFilter === cat
                        ? "bg-white/10 border-white/30 text-white"
                        : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          cat === "Indoor Photoshoot"
                            ? "bg-indigo-400"
                            : cat === "Outdoor Photoshoot"
                            ? "bg-emerald-400"
                            : cat === "Wedding"
                            ? "bg-pink-400"
                            : cat === "Sport"
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                      />
                      <span className="truncate font-medium">{cat}</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Quick Agenda */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {format(currentDate, "EEE, dd MMM")} Bookings
              </h3>
              <span className="text-xs font-bold text-indigo-400">
                {getBookingsForDay(currentDate).length} sessions
              </span>
            </div>

            {getBookingsForDay(currentDate).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No bookings on this date.
              </p>
            ) : (
              <div className="space-y-2">
                {getBookingsForDay(currentDate).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => openBookingModal(b)}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 cursor-pointer transition space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white truncate">
                        {b.clientName}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {formatMYR(b.totalAmount)}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-300 truncate">
                      {b.service.name}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {format(parseISO(b.startTime), "hh:mm a")} –{" "}
                      {format(parseISO(b.endTime), "hh:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Calendar Canvas */}
        <div className="lg:col-span-9 glass-panel rounded-3xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs">Loading studio calendar events...</p>
            </div>
          ) : viewMode === "month" ? (
            /* ================= MONTH VIEW ================= */
            <div>
              {/* Day of week headers */}
              <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400 border-r border-white/5 last:border-r-0"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Month Cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-white/5">
                {monthDays.map((day, idx) => {
                  const dayBookings = getBookingsForDay(day);
                  const dayBlackouts = getBlackoutsForDay(day);
                  const inMonth = isSameMonth(day, currentDate);
                  const todayFlag = isToday(day);
                  const isSelectedDay = isSameDay(day, currentDate);

                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentDate(day)}
                      className={`min-h-[125px] sm:min-h-[145px] p-1.5 sm:p-2 transition-colors flex flex-col ${
                        !inMonth
                          ? "bg-black/30 opacity-45"
                          : isSelectedDay
                          ? "bg-indigo-950/20"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentDate(day);
                            setViewMode("day");
                          }}
                          className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                            todayFlag
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/40"
                              : "text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {format(day, "d")}
                        </button>
                        {dayBookings.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            {dayBookings.length}{" "}
                            {dayBookings.length === 1 ? "shoot" : "shoots"}
                          </span>
                        )}
                      </div>

                      {/* Blackout Banners */}
                      {dayBlackouts.map((bl) => (
                        <div
                          key={bl.id}
                          className="mb-1 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[10px] text-rose-300 font-semibold truncate"
                          title={`Blackout: ${bl.reason || "Studio Closed"}`}
                        >
                          🚫 {bl.reason || "Blackout"}
                        </div>
                      ))}

                      {/* Booking Pills */}
                      <div className="space-y-1 flex-1 overflow-y-auto max-h-[105px] pr-0.5">
                        {dayBookings.map((b) => {
                          const cat = b.service?.category || "Indoor Photoshoot";
                          const styleClass =
                            b.status === "CANCELLED"
                              ? "bg-rose-950/40 border-l-4 border-rose-500 text-rose-300 line-through opacity-60"
                              : CATEGORY_EVENT_STYLES[cat] ||
                                CATEGORY_EVENT_STYLES["Indoor Photoshoot"];

                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBookingModal(b);
                              }}
                              className={`w-full text-left px-2 py-1 rounded-md text-[10px] sm:text-[11px] transition cursor-pointer block truncate ${styleClass}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold truncate">
                                  {format(parseISO(b.startTime), "h:mm a")}{" "}
                                  {b.clientName}
                                </span>
                                {b.status === "PENDING_PAYMENT" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                )}
                              </div>
                              <div className="text-[9px] opacity-80 truncate">
                                {b.service.name} • {formatMYR(b.totalAmount)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === "week" ? (
            /* ================= WEEK VIEW (GOOGLE CALENDAR TIMELINE) ================= */
            <div className="overflow-x-auto">
              <div className="min-w-[780px]">
                {/* Week Header */}
                <div className="grid grid-cols-8 border-b border-white/10 bg-white/[0.02]">
                  <div className="py-3 px-2 text-center text-[10px] font-bold uppercase text-slate-500 border-r border-white/5">
                    MYT (GMT+8)
                  </div>
                  {weekDays.map((day, i) => {
                    const todayFlag = isToday(day);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentDate(day);
                          setViewMode("day");
                        }}
                        className={`py-2.5 px-2 text-center border-r border-white/5 last:border-r-0 cursor-pointer hover:bg-white/5 transition ${
                          todayFlag ? "bg-indigo-600/10" : ""
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          {format(day, "EEE")}
                        </span>
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-extrabold mt-0.5 ${
                            todayFlag
                              ? "bg-indigo-600 text-white"
                              : "text-white"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Hourly Grid Rows */}
                <div className="divide-y divide-white/5">
                  {hoursRange.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 min-h-[68px]">
                      {/* Time Label */}
                      <div className="p-2 text-right pr-3 text-[11px] font-mono text-slate-500 border-r border-white/5">
                        {format(new Date(2026, 0, 1, hour, 0), "hh:mm a")}
                      </div>

                      {/* 7 Day Columns for this Hour */}
                      {weekDays.map((day, dIdx) => {
                        const slotBookings = getBookingsForDay(day).filter(
                          (b) => getHours(parseISO(b.startTime)) === hour
                        );

                        return (
                          <div
                            key={dIdx}
                            className="p-1 border-r border-white/5 last:border-r-0 relative space-y-1"
                          >
                            {slotBookings.map((b) => {
                              const cat =
                                b.service?.category || "Indoor Photoshoot";
                              const styleClass =
                                CATEGORY_EVENT_STYLES[cat] ||
                                CATEGORY_EVENT_STYLES["Indoor Photoshoot"];

                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => openBookingModal(b)}
                                  className={`w-full text-left p-1.5 rounded-lg text-[10px] shadow-md transition cursor-pointer ${styleClass}`}
                                >
                                  <div className="font-bold truncate">
                                    {format(parseISO(b.startTime), "h:mm a")} -{" "}
                                    {format(parseISO(b.endTime), "h:mm a")}
                                  </div>
                                  <div className="font-semibold text-white truncate">
                                    {b.clientName}
                                  </div>
                                  <div className="text-[9px] opacity-85 truncate">
                                    [{cat}] {b.service.name}
                                  </div>
                                  <div className="text-[9px] font-bold text-emerald-300 mt-0.5">
                                    {formatMYR(b.totalAmount)} • +
                                    {b.service.bufferMinutes}m buffer
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : viewMode === "day" ? (
            /* ================= DAY VIEW ================= */
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {format(currentDate, "EEEE, dd MMMM yyyy")}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Detailed hourly studio schedule including post-shoot buffer blocks
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  {getBookingsForDay(currentDate).length} Scheduled Sessions
                </span>
              </div>

              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {hoursRange.map((hour) => {
                  const hourBookings = getBookingsForDay(currentDate).filter(
                    (b) => getHours(parseISO(b.startTime)) === hour
                  );

                  return (
                    <div
                      key={hour}
                      className="flex items-stretch min-h-[72px] bg-white/[0.01] hover:bg-white/[0.02]"
                    >
                      <div className="w-24 sm:w-28 p-3 text-right text-xs font-mono text-slate-500 border-r border-white/5 shrink-0">
                        {format(new Date(2026, 0, 1, hour, 0), "hh:mm a")}
                      </div>
                      <div className="flex-1 p-2 space-y-2">
                        {hourBookings.map((b) => {
                          const cat =
                            b.service?.category || "Indoor Photoshoot";
                          const styleClass =
                            CATEGORY_EVENT_STYLES[cat] ||
                            CATEGORY_EVENT_STYLES["Indoor Photoshoot"];
                          const duration = differenceInMinutes(
                            parseISO(b.endTime),
                            parseISO(b.startTime)
                          );

                          return (
                            <div
                              key={b.id}
                              onClick={() => openBookingModal(b)}
                              className={`p-3.5 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styleClass}`}
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-extrabold text-white">
                                    {format(parseISO(b.startTime), "hh:mm a")} –{" "}
                                    {format(parseISO(b.endTime), "hh:mm a")}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                                      cat
                                    )}`}
                                  >
                                    {cat}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/30 text-slate-300">
                                    {duration}m shoot + {b.service.bufferMinutes}m buffer (until{" "}
                                    {format(parseISO(b.bufferEndTime), "hh:mm a")})
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-white">
                                  {b.clientName} — {b.service.name}
                                </div>
                                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
                                  <span>📞 {b.clientPhone}</span>
                                  <span>✉️ {b.clientEmail}</span>
                                  {b.notes && (
                                    <span className="italic text-slate-400">
                                      &ldquo;{b.notes}&rdquo;
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                                <span className="text-base font-extrabold text-white">
                                  {formatMYR(b.totalAmount)}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    b.status === "CONFIRMED"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================= SCHEDULE / AGENDA VIEW ================= */
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">
                Complete Booking Agenda ({filteredBookings.length})
              </h2>
              {filteredBookings.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  No bookings match the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((b) => {
                    const cat = b.service?.category || "Indoor Photoshoot";
                    return (
                      <div
                        key={b.id}
                        onClick={() => openBookingModal(b)}
                        className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center text-indigo-300 shrink-0">
                            <span className="text-[10px] font-bold uppercase">
                              {format(parseISO(b.startTime), "MMM")}
                            </span>
                            <span className="text-lg font-black text-white">
                              {format(parseISO(b.startTime), "dd")}
                            </span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {b.clientName}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                                  cat
                                )}`}
                              >
                                {cat}
                              </span>
                              <span className="text-xs font-semibold text-indigo-300">
                                {b.service.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(parseISO(b.startTime), "EEEE, dd MMM yyyy")}{" "}
                              • {format(parseISO(b.startTime), "hh:mm a")} –{" "}
                              {format(parseISO(b.endTime), "hh:mm a")} (+
                              {b.service.bufferMinutes}m buffer)
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {b.clientPhone} • {b.clientEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between gap-2">
                          <span className="text-base font-extrabold text-white">
                            {formatMYR(b.totalAmount)}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === "CONFIRMED"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : b.status === "PENDING_PAYMENT"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* GOOGLE CALENDAR STYLE EVENT DETAILS MODAL                         */}
      {/* ================================================================= */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="max-w-xl w-full glass-card rounded-3xl border border-white/15 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Colored Header Bar */}
            <div className="p-6 bg-gradient-to-r from-indigo-950/80 via-indigo-900/40 to-slate-900 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                      selectedBooking.service?.category
                    )}`}
                  >
                    {selectedBooking.service?.category || "Indoor Photoshoot"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedBooking.status === "CONFIRMED"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : selectedBooking.status === "PENDING_PAYMENT"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {selectedBooking.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  {selectedBooking.clientName} — {selectedBooking.service.name}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                  {format(
                    parseISO(selectedBooking.startTime),
                    "EEEE, dd MMMM yyyy"
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {modalFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    modalFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {modalFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{modalFeedback.text}</span>
                  </div>
                  {modalFeedback.directUrl && (
                    <a
                      href={modalFeedback.directUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold whitespace-nowrap"
                    >
                      Open WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Time, Buffer & RM Price Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    Session &amp; Buffer Window
                  </span>
                  <p className="text-sm font-bold text-white">
                    {format(parseISO(selectedBooking.startTime), "hh:mm a")} –{" "}
                    {format(parseISO(selectedBooking.endTime), "hh:mm a")}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedBooking.service.durationMinutes}m shoot +{" "}
                    {selectedBooking.service.bufferMinutes}m buffer (locked until{" "}
                    {format(parseISO(selectedBooking.bufferEndTime), "hh:mm a")})
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-emerald-400" />
                    Package Fee (MYR)
                  </span>
                  <p className="text-xl font-black text-emerald-400">
                    {formatMYR(selectedBooking.totalAmount)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Category: {selectedBooking.service.category || "Indoor Photoshoot"}
                  </p>
                </div>
              </div>

              {/* Client Information */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Customer Contact Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2 text-slate-200">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold">
                      {selectedBooking.clientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="font-mono">
                      {selectedBooking.clientPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 sm:col-span-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{selectedBooking.clientEmail}</span>
                  </div>
                </div>
                {selectedBooking.notes && (
                  <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="italic">{selectedBooking.notes}</span>
                  </div>
                )}
              </div>

              {/* Reschedule Drawer */}
              {rescheduleMode && (
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                  <label className="block text-xs font-bold text-indigo-300">
                    Select New Date &amp; Start Time
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="datetime-local"
                      value={newDateTime}
                      onChange={(e) => setNewDateTime(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#0d101b] border border-white/15 rounded-xl text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleReschedule}
                      disabled={isUpdatingBooking}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                    >
                      {isUpdatingBooking ? "Saving..." : "Save New Time"}
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp & Google Calendar Integration Actions */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  WhatsApp &amp; Google Calendar Actions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDispatchWhatsApp("BOTH")}
                    disabled={isSendingWhatsApp}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingWhatsApp
                      ? "Sending WhatsApp..."
                      : "Notify Customer & Admin (WhatsApp)"}
                  </button>

                  <a
                    href={`https://wa.me/${selectedBooking.clientPhone
                      .replace(/[^\d]/g, "")
                      .replace(/^0/, "60")}?text=${encodeURIComponent(
                      `Hi ${selectedBooking.clientName}, this is EasyBook Studio regarding your ${
                        selectedBooking.service.category || ""
                      } booking (${selectedBooking.service.name}) on ${format(
                        parseISO(selectedBooking.startTime),
                        "dd MMM yyyy, hh:mm a"
                      )} (${formatMYR(selectedBooking.totalAmount)}).`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-white/10 text-xs font-semibold transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    1-Click Chat Customer on WhatsApp
                  </a>

                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      `[${selectedBooking.service.category || "Photoshoot"}] ${
                        selectedBooking.clientName
                      } - ${selectedBooking.service.name}`
                    )}&dates=${new Date(selectedBooking.startTime)
                      .toISOString()
                      .replace(/-|:|\.\d\d\d/g, "")}/${new Date(
                      selectedBooking.endTime
                    )
                      .toISOString()
                      .replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(
                      `Client: ${selectedBooking.clientName}\nPhone: ${
                        selectedBooking.clientPhone
                      }\nEmail: ${selectedBooking.clientEmail}\nCategory: ${
                        selectedBooking.service.category || "Indoor Photoshoot"
                      }\nPackage: ${selectedBooking.service.name}\nAmount: ${formatMYR(
                        selectedBooking.totalAmount
                      )}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Add to Google Calendar
                  </a>

                  <Link
                    href={`/booking/manage/${selectedBooking.manageToken}`}
                    target="_blank"
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Customer Portal
                  </Link>
                </div>
              </div>

              {/* Footer Status Controls */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedBooking.status === "PENDING_PAYMENT" && (
                    <button
                      type="button"
                      disabled={isUpdatingBooking}
                      onClick={() =>
                        handleStatusUpdate(selectedBooking.id, "CONFIRMED")
                      }
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                    >
                      Confirm Booking
                    </button>
                  )}
                  {selectedBooking.status !== "CANCELLED" && (
                    <button
                      type="button"
                      onClick={() => setRescheduleMode(!rescheduleMode)}
                      className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      {rescheduleMode ? "Hide Reschedule" : "Reschedule"}
                    </button>
                  )}
                  {selectedBooking.status !== "CANCELLED" && (
                    <button
                      type="button"
                      disabled={isUpdatingBooking}
                      onClick={() =>
                        handleStatusUpdate(selectedBooking.id, "CANCELLED")
                      }
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Loading studio calendar...</p>
        </div>
      }
    >
      <AdminCalendarView />
    </Suspense>
  );
}


