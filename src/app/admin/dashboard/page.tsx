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
import { formatMYR } from "@/lib/categories";

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Channel Analytics &amp; Bookings
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            Real-time schedule activity, upcoming sessions, and processed sales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/calendar"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#272727] hover:bg-[#383838] text-white text-xs font-medium transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#aaaaaa]" />
            Calendar
          </Link>
          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#272727] hover:bg-[#383838] text-white text-xs font-medium transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-[#aaaaaa]" />
            Notifications
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#272727] hover:bg-[#383838] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 4 Metric Cards - YouTube Studio Flat Surface */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Shoots */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#aaaaaa]">
              Today&apos;s Sessions
            </span>
            <Camera className="w-4 h-4 text-[#717171]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {todayShoots}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">Confirmed for today</p>
        </div>

        {/* Confirmed Next 7 Days */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#aaaaaa]">
              Next 7 Days
            </span>
            <CalendarDays className="w-4 h-4 text-[#717171]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {upcomingConfirmedThisWeek}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">Upcoming booked slots</p>
        </div>

        {/* Total Confirmed Revenue */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#aaaaaa]">
              Revenue (MYR)
            </span>
            <Banknote className="w-4 h-4 text-[#717171]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {formatMYR(totalRevenue)}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">Processed sales in RM</p>
        </div>

        {/* Pending Holds */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#aaaaaa]">
              Pending Holds
            </span>
            <Clock className="w-4 h-4 text-[#717171]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {pendingHolds}
          </div>
          <p className="text-[11px] text-[#717171] mt-1">15-minute checkout holds</p>
        </div>
      </div>

      {/* Upcoming Appointments Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white">Upcoming Photoshoots</h2>
            <p className="text-xs text-[#aaaaaa] mt-0.5">
              Live scheduled sessions and client bookings.
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-[#f1f1f1] hover:underline inline-flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#aaaaaa] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#ff0000]" />
            <p className="text-xs">Loading sessions...</p>
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="py-12 text-center text-[#717171] border border-dashed border-[#2a2a2a] rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#aaaaaa]" />
            <p className="text-sm font-medium text-[#f1f1f1]">No appointments scheduled</p>
            <p className="text-xs text-[#717171] mt-1">
              Guest bookings will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#717171] border-b border-[#2a2a2a]">
                <tr>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Category &amp; Package</th>
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {upcomingAppointments.map((b) => (
                  <tr key={b.id} className="hover:bg-[#222222] transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white block">{b.clientName}</span>
                      <span className="text-[#aaaaaa] text-[11px]">{b.clientPhone || b.clientEmail}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[#272727] text-[#f1f1f1] border border-[#383838]">
                          {b.service.category || "Indoor Photoshoot"}
                        </span>
                      </div>
                      <span className="text-white font-medium block">
                        {b.service.name}
                      </span>
                      <span className="text-[#717171] text-[11px]">
                        {b.service.durationMinutes}m duration
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-white font-medium block">
                        {format(parseISO(b.startTime), "EEE, dd MMM yyyy")}
                      </span>
                      <span className="text-[#aaaaaa] text-[11px]">
                        {format(parseISO(b.startTime), "hh:mm a")} –{" "}
                        {format(parseISO(b.endTime), "hh:mm a")}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {formatMYR(b.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      {b.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0e2a1b] text-[#2ba640] border border-[#2ba640]/30">
                          <CheckCircle2 className="w-3 h-3" />
                          CONFIRMED
                        </span>
                      ) : b.status === "PENDING_PAYMENT" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#2a220e] text-[#f2a600] border border-[#f2a600]/30">
                          <Clock className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#222222] text-[#aaaaaa]">
                          {b.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/booking/manage/${b.manageToken}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#f1f1f1] hover:text-white px-2.5 py-1 rounded bg-[#272727] hover:bg-[#383838] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-[#aaaaaa]" />
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
        <div className="py-24 flex flex-col items-center justify-center text-[#aaaaaa] gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff0000]" />
          <p className="text-xs">Loading studio dashboard...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
