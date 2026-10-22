"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

function SuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const ref = searchParams.get("ref");

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Booking Confirmed
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">
          You&apos;re All Set for Your Shoot!
        </h1>

        <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-lg mx-auto">
          Your payment has been verified and your photoshoot appointment is officially locked in our studio schedule.
        </p>

        {/* Key Info Cards */}
        <div className="space-y-3 mb-8 text-left">
          {ref && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400">Payment Reference:</span>
              <span className="font-mono font-bold text-white">{ref}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <Mail className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-white">Google Calendar Invite Dispatched</p>
              <p className="text-indigo-200/80 mt-0.5">
                A calendar invitation with studio location details and photoshoot tips has been sent to your email.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {token ? (
            <Link
              href={`/booking/manage/${token}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all"
            >
              Manage Your Booking
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all"
            >
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
          >
            Book Another Shoot
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <Suspense
          fallback={
            <div className="py-24 text-center text-slate-400">
              Loading confirmation...
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
