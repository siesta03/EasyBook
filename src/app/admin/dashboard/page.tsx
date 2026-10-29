"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO, isToday } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Banknote,
  Users,
  Camera,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Loader2,
  Bell,
} from "lucide-react";
import { formatMYR, getCategoryBadgeClass } from "@/lib/categories";

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
  service: ServicePackage;
  startTime: string;
  endTime: string;
  totalAmount: string | number;
  status: "CONFIRMED" | "PENDING_PAYMENT" | "CANCELLED" | "EXPIRED";
}

function AdminDashboardContent() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const res = await fetch("/api/admin/bookings");
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

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute Metrics
  const now = new Date();
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED");

  const todayShoots = confirmedBookings.filter((b) =>
    isToday(parseISO(b.startTime))
  ).length;

  const nextWeekLimit = new Date();
  nextWeekLimit.setDate(nextWeekLimit.getDate() + 7);

  const upcomingConfirmedThisWeek = confirmedBookings.filter((b) => {
    const d = parseISO(b.startTime);
    return d >= now && d <= nextWeekLimit;
  }).length;

  const totalRevenue = confirmedBookings.reduce(
    (acc, b) => acc + Number(b.totalAmount || 0),
    0
  );

  const pendingHolds = bookings.filter(
    (b) => b.status === "PENDING_PAYMENT"
  ).length;

  const upcomingAppointments = bookings
    .filter((b) => b.status !== "CANCELLED" && b.status !== "EXPIRED")
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Studio Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time snapshot of bookings, live revenue, and upcoming shoots.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <Link
            href="/admin/calendar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-semibold transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Open Calendar View
          </Link>
          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-semibold transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/5 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Live Data
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Shoots */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Shoots
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{todayShoots}</div>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed appointments today</p>
        </div>

        {/* Confirmed Next 7 Days */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Next 7 Days
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{upcomingConfirmedThisWeek}</div>
          <p className="text-[11px] text-slate-500 mt-1">Upcoming confirmed shoots</p>
        </div>

        {/* Total Confirmed Revenue */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Confirmed Revenue (MYR)
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
            {formatMYR(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Processed photoshoot sales in RM</p>
        </div>

        {/* Pending Holds */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Holds
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{pendingHolds}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active 15-min transient holds</p>
        </div>
      </div>

      {/* Upcoming Appointments Table */}
      <div className="glass-panel rounded-3xl border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Upcoming Photoshoots</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live scheduled sessions and client details.
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
          >
            View All Bookings
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-xs">Loading appointments...</p>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-white/5 rounded-2xl">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold text-slate-300">No appointments scheduled</p>
            <p className="text-xs text-slate-500 mt-1">
              New guest bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/5">
                <tr>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Package</th>
                  <th className="py-3 px-3">Scheduled Date & Time</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {upcomingAppointments.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-white block">{b.clientName}</span>
                      <span className="text-slate-500 text-[11px]">{b.clientEmail}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-1 ${getCategoryBadgeClass(
                          b.service.category
                        )}`}
                      >
                        {b.service.category || "Indoor Photoshoot"}
                      </span>
                      <span className="font-semibold text-indigo-300 block">
                        {b.service.name}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {b.service.durationMinutes} mins + {b.service.bufferMinutes ?? 30}m buffer
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-white font-medium block">
                        {format(parseISO(b.startTime), "EEE, dd MMM yyyy")}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {format(parseISO(b.startTime), "hh:mm a")} -{" "}
                        {format(parseISO(b.endTime), "hh:mm a")}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-white">
                      {formatMYR(b.totalAmount)}
                    </td>
                    <td className="py-3.5 px-3">
                      {b.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                      ) : b.status === "PENDING_PAYMENT" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {b.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/booking/manage/${b.manageToken}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm">Loading studio dashboard...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
