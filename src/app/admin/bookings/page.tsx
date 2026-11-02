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

  const filteredBookings = bookings.filter(
    (b) =>
      categoryFilter === "ALL" ||
      (b.service.category || "Indoor Photoshoot") === categoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] tracking-tight">
            Bookings
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            Manage, confirm, and update customer shoot sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#f1f1f1] text-xs font-medium transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#aaaaaa]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-[#2e1414] border border-[#521c1c] text-[#fca5a5] text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-[#1a1a1a] p-3.5 rounded-2xl border border-[#2a2a2a] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717171]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#2a2a2a] rounded-full text-[#f1f1f1] placeholder-[#717171] text-xs focus:outline-none focus:border-[#3ea6ff]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#121212] border border-[#2a2a2a] rounded-full px-4 py-2 text-xs font-medium text-[#f1f1f1] focus:outline-none focus:border-[#3ea6ff] w-full md:w-auto"
          >
            <option value="ALL">All Categories</option>
            {PHOTOSHOOT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar">
          {[
            { id: "ALL", label: "All Bookings" },
            { id: "CONFIRMED", label: "Confirmed" },
            { id: "PENDING_PAYMENT", label: "Pending" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((st) => {
            const active = statusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#f1f1f1] text-[#0f0f0f] font-semibold"
                    : "bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#333333]"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings Table Panel */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#aaaaaa] gap-2.5">
            <Loader2 className="w-6 h-6 animate-spin text-[#aaaaaa]" />
            <p className="text-xs">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center text-[#717171]">
            <CalendarIcon className="w-9 h-9 mx-auto mb-2 opacity-40 text-[#717171]" />
            <p className="text-sm font-semibold text-[#aaaaaa]">No bookings found</p>
            <p className="text-xs text-[#717171] mt-0.5">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#717171] bg-[#141414] border-b border-[#2a2a2a]">
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Scheduled Window</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222]">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#202020] transition-colors">
                    {/* Client */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#f1f1f1] block text-xs">
                        {b.clientName}
                      </span>
                      <div className="text-[#aaaaaa] text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-[#717171]" />
                        <span>{b.clientEmail}</span>
                      </div>
                      <div className="text-[#aaaaaa] text-[11px] flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-[#717171]" />
                        <span>{b.clientPhone}</span>
                      </div>
                    </td>

                    {/* Package */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border mb-1 ${getCategoryBadgeClass(
                          b.service.category
                        )}`}
                      >
                        {b.service.category || "Indoor Photoshoot"}
                      </span>
                      <span className="font-medium text-[#f1f1f1] block text-xs">
                        {b.service.name}
                      </span>
                      <span className="text-[#717171] text-[11px]">
                        {b.service.durationMinutes}m shoot + {b.service.bufferMinutes ?? 30}m buffer
                      </span>
                      {b.notes && (
                        <p className="text-[#aaaaaa] italic text-[11px] mt-1 max-w-xs truncate">
                          &quot;{b.notes}&quot;
                        </p>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#f1f1f1] block">
                        {format(parseISO(b.startTime), "EEEE, dd MMM yyyy")}
                      </span>
                      <span className="text-[#aaaaaa] text-[11px] block mt-0.5">
                        {format(parseISO(b.startTime), "hh:mm a")} -{" "}
                        {format(parseISO(b.endTime), "hh:mm a")}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-semibold text-[#f1f1f1] text-xs">
                      {formatMYR(b.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {b.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#0e2a1b] text-[#4ade80] border border-[#164e2d]">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmed
                        </span>
                      ) : b.status === "PENDING_PAYMENT" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#2a220e] text-[#facc15] border border-[#544315]">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : b.status === "CANCELLED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#2e1414] text-[#f87171] border border-[#521c1c]">
                          <XCircle className="w-3 h-3" />
                          Cancelled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#272727] text-[#aaaaaa] border border-[#383838]">
                          {b.status}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Confirm */}
                        {b.status === "PENDING_PAYMENT" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "CONFIRMED")}
                            title="Confirm Booking"
                            className="px-2.5 py-1 rounded-md bg-[#0e2a1b] hover:bg-[#153f28] text-[#4ade80] border border-[#164e2d] text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {/* Reschedule */}
                        {b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleBooking(b);
                              const dt = new Date(b.startTime);
                              const localStr = new Date(
                                dt.getTime() - dt.getTimezoneOffset() * 60000
                              )
                                .toISOString()
                                .slice(0, 16);
                              setNewDateTime(localStr);
                            }}
                            className="px-2.5 py-1 rounded-md bg-[#272727] hover:bg-[#333333] text-[#f1f1f1] text-[11px] font-medium border border-[#383838] transition-colors cursor-pointer"
                          >
                            Reschedule
                          </button>
                        )}

                        {/* Cancel */}
                        {b.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, "CANCELLED")}
                            title="Cancel Booking"
                            className="px-2.5 py-1 rounded-md bg-[#2e1414] hover:bg-[#3e1b1b] text-[#f87171] border border-[#521c1c] text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        {/* WhatsApp Message */}
                        <a
                          href={`https://wa.me/${b.clientPhone.replace(/[^\d]/g, "").replace(/^0/, "60")}?text=${encodeURIComponent(`Hi ${b.clientName}, this is regarding your photoshoot booking for ${b.service.name} (${formatMYR(b.totalAmount)})!`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Message Client on WhatsApp"
                          className="p-1.5 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] hover:text-[#4ade80] transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {/* Google Calendar */}
                        <a
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Photoshoot: ${b.clientName} - ${b.service.name}`)}&dates=${new Date(b.startTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(b.endTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(`Client: ${b.clientName}\nPhone: ${b.clientPhone}\nEmail: ${b.clientEmail}\nService: ${b.service.name}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Add to Google Calendar"
                          className="p-1.5 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] hover:text-[#3ea6ff] transition-colors"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                        </a>

                        {/* Client Portal Link */}
                        <Link
                          href={`/booking/manage/${b.manageToken}`}
                          target="_blank"
                          title="Open Customer Management Portal"
                          className="p-1.5 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-md w-full bg-[#1f1f1f] p-6 rounded-2xl border border-[#303030] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#f1f1f1]">Reschedule Session</h3>
            <p className="text-xs text-[#aaaaaa]">
              Select a new start date & time for{" "}
              <span className="text-[#f1f1f1] font-semibold">
                {rescheduleBooking.clientName}
              </span>{" "}
              ({rescheduleBooking.service.name}).
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                New Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRescheduleBooking(null)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-full border border-[#383838] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#272727] text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleSubmit}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
