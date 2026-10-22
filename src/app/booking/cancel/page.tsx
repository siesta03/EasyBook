"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, Clock } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function BookingCancelPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <AlertCircle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Payment Not Completed
          </h1>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your photoshoot booking checkout was cancelled or timed out. Any temporary 15-minute slot lock will be automatically released back to the calendar.
          </p>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 mb-8 flex items-center gap-2.5 text-left">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              If you still wish to reserve this photoshoot, you can return to the booking page and try again.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Booking Again
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1.5" />
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
