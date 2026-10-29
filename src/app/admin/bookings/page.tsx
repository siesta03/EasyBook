"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  PHOTOSHOOT_CATEGORIES,
  formatMYR,
  getCategoryBadgeClass,
} from "@/lib/categories";

interface ServicePackage {
  id: string;
  name: string;
  category?: string;
  price: string | number;
  durationMinutes: number;
  bufferMinutes?: number;
}

interface Booking {
  id: string;
  manageToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string | null;
  service: ServicePackage;
  startTime: string;
  endTime: string;
  totalAmount: string | number;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
  calendarEventId?: string | null;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Reschedule Modal
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadBookings() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.append("status", statusFilter);
        if (searchQuery.trim()) params.append("q", searchQuery.trim());

        const res = await fetch(`/api/admin/bookings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setBookings(data);
          }
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadBookings();

    return () => {
      ignore = true;
    };
  }, [searchQuery, statusFilter]);

  const handleRefresh = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("q", searchQuery.trim());

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Failed to load bookings:", err);
    }
  };

  // Status Change Action (Confirm / Cancel)
  const handleUpdateStatus = async (
    bookingId: string,
    status: "CONFIRMED" | "CANCELLED"
  ) => {
    setActionError(null);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update booking status");
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? data.booking : b))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setActionError(msg);
    }
  };

  // Submit Reschedule
  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !newDateTime) return;
    setIsUpdating(true);
    setActionError(null);

    try {
      const isoString = new Date(newDateTime).toISOString();
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: rescheduleBooking.id,
          startTime: isoString,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Rescheduling failed");
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === rescheduleBooking.id ? data.booking : b))
      );
      setRescheduleBooking(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reschedule failed";
      setActionError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Bookings Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, filter, confirm, reschedule, or cancel all customer sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold transition-all self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Global Action Error Alert */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, email, or phone number..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#121521] border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 w-full md:w-auto"
        >
          <option value="ALL">All Categories</option>
          {PHOTOSHOOT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["ALL", "CONFIRMED", "PENDING_PAYMENT", "CANCELLED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {st === "ALL" ? "All Bookings" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs">Loading bookings data...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-base font-semibold text-slate-300">No bookings found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-white/[0.01] border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4">Package</th>
                  <th className="py-3.5 px-4">Scheduled Window</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings
                  .filter(
                    (b) =>
                      categoryFilter === "ALL" ||
                      (b.service.category || "Indoor Photoshoot") ===
                        categoryFilter
                  )
                  .map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Client */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-white block text-sm">{b.clientName}</span>
                      <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{b.clientEmail}</span>
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{b.clientPhone}</span>
                      </div>
                    </td>

                    {/* Package */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${getCategoryBadgeClass(
                          b.service.category
                        )}`}
                      >
                        {b.service.category || "Indoor Photoshoot"}
                      </span>
                      <span className="font-bold text-indigo-300 block text-xs">
                        {b.service.name}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {b.service.durationMinutes}m shoot + {b.service.bufferMinutes ?? 30}m buffer
                      </span>
                      {b.notes && (
                        <p className="text-slate-400 italic text-[11px] mt-1 max-w-xs truncate">
                          &quot;{b.notes}&quot;
                        </p>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-4 px-4">
                      <span className="font-semibold text-white block">
                        {format(parseISO(b.startTime), "EEEE, dd MMM yyyy")}
                      </span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">
                        {format(parseISO(b.startTime), "hh:mm a")} -{" "}
                        {format(parseISO(b.endTime), "hh:mm a")}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 font-bold text-white text-sm">
                      {formatMYR(b.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {b.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                      ) : b.status === "PENDING_PAYMENT" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : b.status === "CANCELLED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          CANCELLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {b.status}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Confirm Button */}
                        {b.status === "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                            title="Confirm Booking"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {/* Reschedule Button */}
                        {b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleBooking(b);
                              const dt = new Date(b.startTime);
                              // Format for datetime-local input: YYYY-MM-DDTHH:mm
                              const localStr = new Date(
                                dt.getTime() - dt.getTimezoneOffset() * 60000
                              )
                                .toISOString()
                                .slice(0, 16);
                              setNewDateTime(localStr);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 cursor-pointer"
                          >
                            Reschedule
                          </button>
                        )}

                        {/* Cancel Button */}
                        {b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "CANCELLED")}
                            title="Cancel Booking"
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        {/* 1-Click WhatsApp Client Message */}
                        <a
                          href={`https://wa.me/${b.clientPhone.replace(/[^\d]/g, "").replace(/^0/, "60")}?text=${encodeURIComponent(`Hi ${b.clientName}, this is regarding your EasyBook [${b.service.category || "Photoshoot"}] booking for ${b.service.name} (${formatMYR(b.totalAmount)})!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Message Client on WhatsApp"
                          className="p-1.5 rounded-lg border border-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* 1-Click Add to Google Calendar */}
                        <a
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Photoshoot: ${b.clientName} - ${b.service.name}`)}&dates=${new Date(b.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(b.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(`Client: ${b.clientName}\nPhone: ${b.clientPhone}\nEmail: ${b.clientEmail}\nService: ${b.service.name}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Add to Google Calendar"
                          className="p-1.5 rounded-lg border border-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </a>

                        {/* Guest Manage Token Link */}
                        <Link
                          href={`/booking/manage/${b.manageToken}`}
                          target="_blank"
                          title="Open Guest Management Portal"
                          className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Reschedule Appointment</h3>
            <p className="text-xs text-slate-400">
              Select a new start date & time for{" "}
              <span className="text-white font-semibold">
                {rescheduleBooking.clientName}
              </span>{" "}
              ({rescheduleBooking.service.name}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                disabled={isUpdating}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking & Rescheduling...
                  </>
                ) : (
                  "Confirm Reschedule"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
