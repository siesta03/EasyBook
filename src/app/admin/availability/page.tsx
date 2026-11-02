"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Clock,
  Calendar as CalendarIcon,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface OperatingHours {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

interface BlackoutDate {
  id: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AdminAvailabilityPage() {
  const [hours, setHours] = useState<OperatingHours[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Operating Hours save feedback
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [hoursFeedback, setHoursFeedback] = useState<string | null>(null);

  // Blackout Date form
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");
  const [isAddingBlackout, setIsAddingBlackout] = useState(false);
  const [blackoutError, setBlackoutError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAvailability() {
      try {
        const res = await fetch("/api/admin/availability");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setHours(data.operatingHours);
            setBlackouts(data.blackoutDates);
          }
        }
      } catch (err) {
        console.error("Failed to load availability:", err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      ignore = true;
    };
  }, []);

  const handleHourChange = (
    dayIndex: number,
    field: keyof OperatingHours,
    value: string | boolean
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayIndex ? { ...h, [field]: value } : h))
    );
  };

  const saveOperatingHours = async () => {
    setIsSavingHours(true);
    setHoursFeedback(null);

    try {
      const res = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });

      if (!res.ok) {
        throw new Error("Failed to update operating hours");
      }

      setHoursFeedback("Operating hours successfully saved!");
      setTimeout(() => setHoursFeedback(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving";
      setHoursFeedback(`Error: ${msg}`);
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleAddBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutStart || !blackoutEnd) {
      setBlackoutError("Please select both start and end dates/times");
      return;
    }

    setIsAddingBlackout(true);
    setBlackoutError(null);

    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(blackoutStart).toISOString(),
          endTime: new Date(blackoutEnd).toISOString(),
          reason: blackoutReason || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add blackout block");
      }

      setBlackouts((prev) => [...prev, data]);
      setBlackoutStart("");
      setBlackoutEnd("");
      setBlackoutReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add blackout";
      setBlackoutError(msg);
    } finally {
      setIsAddingBlackout(false);
    }
  };

  const handleDeleteBlackout = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability?blackoutId=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete blackout date");
      }

      setBlackouts((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete blackout");
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] tracking-tight">
          Operating Hours &amp; Blackout Dates
        </h1>
        <p className="text-xs text-[#aaaaaa] mt-0.5">
          Manage weekly studio operating hours and scheduled closures.
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#aaaaaa] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#aaaaaa]" />
          <p className="text-xs">Loading availability settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Weekly Operating Hours */}
          <div className="lg:col-span-7 bg-[#1a1a1a] p-5 sm:p-6 rounded-2xl border border-[#2a2a2a] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
              <div>
                <h2 className="text-sm font-semibold text-[#f1f1f1] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#aaaaaa]" />
                  Weekly Operating Hours
                </h2>
                <p className="text-xs text-[#717171] mt-0.5">
                  Dynamic booking slots are generated during open hours.
                </p>
              </div>

              <button
                type="button"
                onClick={saveOperatingHours}
                disabled={isSavingHours}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingHours ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Hours
                  </>
                )}
              </button>
            </div>

            {hoursFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  hoursFeedback.includes("Error")
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                }`}
              >
                {hoursFeedback.includes("Error") ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{hoursFeedback}</span>
              </div>
            )}

            {/* 7 Days Table/List */}
            <div className="space-y-3">
              {hours.map((h) => {
                const dayName = dayNames[h.dayOfWeek];
                return (
                  <div
                    key={h.dayOfWeek}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      h.isClosed
                        ? "bg-white/[0.01] border-white/5 opacity-60"
                        : "bg-white/[0.03] border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 w-36">
                      <input
                        type="checkbox"
                        id={`closed-${h.dayOfWeek}`}
                        checked={!h.isClosed}
                        onChange={(e) =>
                          handleHourChange(h.dayOfWeek, "isClosed", !e.target.checked)
                        }
                        className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 w-4 h-4"
                      />
                      <label
                        htmlFor={`closed-${h.dayOfWeek}`}
                        className={`text-xs sm:text-sm font-bold cursor-pointer select-none ${
                          h.isClosed ? "text-slate-500" : "text-white"
                        }`}
                      >
                        {dayName}
                      </label>
                    </div>

                    {h.isClosed ? (
                      <span className="text-xs font-semibold text-rose-400/80 uppercase tracking-wider py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 w-fit">
                        Closed
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[11px]">Open:</span>
                          <input
                            type="time"
                            value={h.openTime}
                            onChange={(e) =>
                              handleHourChange(h.dayOfWeek, "openTime", e.target.value)
                            }
                            className="px-2.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                          />
                        </div>

                        <span className="text-slate-600">-</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[11px]">Close:</span>
                          <input
                            type="time"
                            value={h.closeTime}
                            onChange={(e) =>
                              handleHourChange(h.dayOfWeek, "closeTime", e.target.value)
                            }
                            className="px-2.5 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Blackout Dates Manager */}
          <div className="lg:col-span-5 space-y-6">
            {/* Create Blackout Form */}
            <div className="bg-[#1a1a1a] p-5 sm:p-6 rounded-2xl border border-[#2a2a2a] space-y-4">
              <h2 className="text-sm font-semibold text-[#f1f1f1] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#ff4e4e]" />
                Add Blackout Window
              </h2>
              <p className="text-xs text-[#aaaaaa]">
                Disable slot reservations during studio maintenance, holidays, or private sessions.
              </p>

              {blackoutError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {blackoutError}
                </div>
              )}

              <form onSubmit={handleAddBlackout} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blackoutStart}
                    onChange={(e) => setBlackoutStart(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                    End Date &amp; Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blackoutEnd}
                    onChange={(e) => setBlackoutEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                    Reason / Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={blackoutReason}
                    onChange={(e) => setBlackoutReason(e.target.value)}
                    placeholder="e.g. Studio Maintenance, Off-Site Shoot"
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAddingBlackout}
                  className="w-full py-2 rounded-full bg-[#cc0000] hover:bg-[#b30000] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAddingBlackout ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Add Blackout Window
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List of Blackout Dates */}
            <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-[#2a2a2a] space-y-3">
              <h3 className="text-xs font-semibold text-[#aaaaaa] uppercase tracking-wider">
                Active Blackouts ({blackouts.length})
              </h3>

              {blackouts.length === 0 ? (
                <p className="text-xs text-[#717171] py-4 text-center">
                  No active blackout dates.
                </p>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {blackouts.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-[#202020] border border-[#2a2a2a] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-medium text-[#f1f1f1] block">
                          {b.reason || "Studio Blackout"}
                        </span>
                        <span className="text-[11px] text-[#aaaaaa] block mt-0.5">
                          {format(parseISO(b.startTime), "dd MMM, hh:mm a")} -{" "}
                          {format(parseISO(b.endTime), "dd MMM, hh:mm a")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(b.id)}
                        className="p-1.5 text-[#aaaaaa] hover:text-[#f87171] hover:bg-[#2e1414] rounded-lg transition-colors cursor-pointer"
                        title="Remove Blackout"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
