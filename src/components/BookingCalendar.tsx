"use client";

import { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface BookingCalendarProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
}

export function BookingCalendar({ selectedDate, onSelectDate }: BookingCalendarProps) {
  const today = startOfDay(new Date());
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [year, month, day] = selectedDate.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return today;
  });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const selectedDateObj = selectedDate
    ? (() => {
        const [year, month, day] = selectedDate.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : null;

  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const prevMonth = () => {
    setCurrentMonth((prev) => {
      const target = subMonths(prev, 1);
      return isBefore(endOfMonth(target), today) ? prev : target;
    });
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const isPrevDisabled = isBefore(endOfMonth(subMonths(currentMonth, 1)), today);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5">
      {/* Month Header Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-white text-sm sm:text-base">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            disabled={isPrevDisabled}
            className={`p-1.5 rounded-lg border transition-all ${
              isPrevDisabled
                ? "border-white/5 text-slate-600 cursor-not-allowed"
                : "border-white/10 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
            }`}
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map((d) => (
          <span key={d} className="text-xs font-semibold text-slate-500 py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((day, idx) => {
          const isSelected = selectedDateObj ? isSameDay(day, selectedDateObj) : false;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isPast = isBefore(day, today);
          const isDayToday = isSameDay(day, today);

          const dateStr = format(day, "yyyy-MM-dd");

          if (!isCurrentMonth) {
            return (
              <div
                key={idx}
                className="h-9 sm:h-10 flex items-center justify-center text-xs text-slate-700 select-none"
              >
                {format(day, "d")}
              </div>
            );
          }

          if (isPast) {
            return (
              <div
                key={idx}
                className="h-9 sm:h-10 flex items-center justify-center text-xs text-slate-600/50 cursor-not-allowed line-through select-none"
              >
                {format(day, "d")}
              </div>
            );
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 font-bold"
                  : "text-slate-200 hover:bg-white/10 hover:text-white hover:scale-105"
              } ${isDayToday && !isSelected ? "border border-indigo-500/40 text-indigo-300" : ""}`}
            >
              <span>{format(day, "d")}</span>
              {isDayToday && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? "bg-white" : "bg-indigo-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
