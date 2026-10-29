"use client";

import { useEffect, useState, use, Suspense } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Camera,
  ArrowLeft,
  Loader2,
  Trash2,
  ShieldAlert,
  Sparkles,
  MessageSquare,
  CalendarPlus,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { formatMYR, getCategoryBadgeClass } from "@/lib/categories";

interface ServicePackage {
  id: string;
  name: string;
  category?: string;
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
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  calendarEventId?: string | null;
  createdAt: string;
}

function ManageBookingContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [canCancel, setCanCancel] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/bookings/manage/${token}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Booking not found");
        }
        const data = await res.json();
        setBooking(data);
        const hoursRemaining =
          (new Date(data.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
        setCanCancel(data.status !== "CANCELLED" && hoursRemaining >= 24);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load booking details";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    if (token) {
      loadBooking();
    }
  }, [token]);

  const handleCancelBooking = async () => {
    if (!token) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/manage/${token}`, {
        method: "PATCH",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel booking");
      }

      setBooking(data.booking);
      setCanCancel(false);
      setIsModalOpen(false);
      setCancelSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel booking";
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Fetching your booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 text-center">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Booking Not Found</h1>
            <p className="text-sm text-slate-400 mb-6">
              {error || "The management token in this URL is invalid or has expired."}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Booking Page
            </Link>
          </div>
        </div>
      </div>
    );
  }


  const statusBadges = {
    CONFIRMED: {
      label: "Confirmed & Locked",
      bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
      icon: CheckCircle2,
    },
    PENDING_PAYMENT: {
      label: "Pending Payment",
      bg: "bg-amber-500/10 border-amber-500/20 text-amber-300",
      icon: Clock,
    },
    CANCELLED: {
      label: "Cancelled",
      bg: "bg-rose-500/10 border-rose-500/20 text-rose-300",
      icon: XCircle,
    },
    EXPIRED: {
      label: "Hold Expired",
      bg: "bg-slate-500/10 border-slate-500/20 text-slate-400",
      icon: AlertCircle,
    },
  };

  const currentBadge = statusBadges[booking.status] || statusBadges.CONFIRMED;
  const BadgeIcon = currentBadge.icon;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Studio Homepage
          </Link>
        </div>

        {/* Cancellation Feedback Notification */}
        {cancelSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium">
              Your photoshoot booking has been successfully cancelled and removed from the schedule.
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
                Booking ID: {booking.id}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Manage Photoshoot Booking
              </h1>
            </div>

            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${currentBadge.bg} self-start sm:self-center shadow-md`}
            >
              <BadgeIcon className="w-4 h-4" />
              {currentBadge.label}
            </div>
          </div>

          {/* Grid: Session & Schedule Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Package Box */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  Service Package
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                    booking.service.category
                  )}`}
                >
                  {booking.service.category || "Indoor Photoshoot"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{booking.service.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {booking.service.description}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-white/5 text-slate-400">
                <span>
                  {booking.service.durationMinutes} mins shoot + {booking.service.bufferMinutes} mins buffer
                </span>
                <span className="text-base font-extrabold text-white">
                  {formatMYR(booking.totalAmount)}
                </span>
              </div>
            </div>

            {/* Scheduled Time Box */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
              <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4" />
                Scheduled Appointment
              </span>
              <h3 className="text-lg font-bold text-white">
                {format(parseISO(booking.startTime), "EEEE, dd MMMM yyyy")}
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-pink-400" />
                <span>
                  {format(parseISO(booking.startTime), "hh:mm a")} -{" "}
                  {format(parseISO(booking.endTime), "hh:mm a")} (UTC Time Window)
                </span>
              </div>
              <div className="pt-2 text-xs text-slate-400 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  WhatsApp &amp; Calendar Synced
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${booking.clientPhone
                      .replace(/[^\d]/g, "")
                      .replace(/^0/, "60")}?text=${encodeURIComponent(
                      `📸 *EasyBook Studio Receipt*\nClient: ${booking.clientName}\nCategory: ${
                        booking.service.category || "Indoor Photoshoot"
                      }\nPackage: ${booking.service.name}\nDate: ${format(
                        parseISO(booking.startTime),
                        "EEEE, dd MMM yyyy"
                      )}\nTime: ${format(parseISO(booking.startTime), "hh:mm a")} - ${format(
                        parseISO(booking.endTime),
                        "hh:mm a"
                      )}\nAmount: ${formatMYR(booking.totalAmount)}\nManage Link: ${
                        typeof window !== "undefined" ? window.location.href : ""
                      }`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Send to WhatsApp
                  </a>
                  <a
                    href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                      `[${booking.service.category || "Photoshoot"}] ${booking.service.name}`
                    )}&dates=${new Date(booking.startTime)
                      .toISOString()
                      .replace(/-|:|\.\d\d\d/g, "")}/${new Date(booking.endTime)
                      .toISOString()
                      .replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(
                      `EasyBook Studio Session\nCategory: ${
                        booking.service.category || "Indoor Photoshoot"
                      }\nPackage: ${booking.service.name}\nTotal: ${formatMYR(
                        booking.totalAmount
                      )}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 font-semibold"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    Google Calendar
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Registered Guest Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2.5 text-slate-300">
                <User className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Client</span>
                  <span className="font-semibold text-white">{booking.clientName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Email</span>
                  <span className="font-semibold text-white truncate max-w-[180px] block">
                    {booking.clientEmail}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Phone</span>
                  <span className="font-semibold text-white">{booking.clientPhone}</span>
                </div>
              </div>
            </div>
            {booking.notes && (
              <div className="pt-3 border-t border-white/5 text-xs">
                <span className="text-slate-500 block text-[10px] mb-0.5">Notes</span>
                <p className="text-slate-300 italic">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Cancellation Actions & Policy */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-slate-300">Cancellation Policy:</p>
              <p className="text-slate-500">
                Bookings can be cancelled up to 24 hours prior to the scheduled shoot time.
              </p>
            </div>

            {booking.status !== "CANCELLED" && (
              <div>
                <button
                  type="button"
                  disabled={!canCancel}
                  onClick={() => setIsModalOpen(true)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    canCancel
                      ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 cursor-pointer shadow-md"
                      : "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel Booking
                </button>
                {!canCancel && (
                  <p className="text-[10px] text-rose-400/80 mt-1 sm:text-right">
                    Shoot is less than 24h away
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-md w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Cancel Photoshoot Booking?</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Are you sure you want to cancel your session on{" "}
                  <span className="text-white font-semibold">
                    {format(parseISO(booking.startTime), "dd MMMM yyyy")}
                  </span>
                  ? This will release your time slot back to the public calendar and remove your Google Calendar invite.
                </p>
              </div>

              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {cancelError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={isCancelling}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Yes, Cancel Booking"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function GuestManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
          <Navbar />
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-sm">Loading booking details...</p>
          </div>
        </div>
      }
    >
      <ManageBookingContent params={params} />
    </Suspense>
  );
}
