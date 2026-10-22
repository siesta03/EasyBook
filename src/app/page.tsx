"use client";

import { useEffect, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Sparkles,
  Clock,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BookingCalendar } from "@/components/BookingCalendar";

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: string | number;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  label: string;
  available: boolean;
}

const clientDetailsSchema = z.object({
  clientName: z.string().min(2, "Full Name must be at least 2 characters"),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientPhone: z
    .string()
    .min(8, "Please enter a valid WhatsApp or contact phone number"),
  notes: z.string().optional(),
});

type ClientDetailsForm = z.infer<typeof clientDetailsSchema>;

function BookingWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Data states
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [selectedService, setSelectedService] = useState<ServicePackage | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup for Step 3
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ClientDetailsForm>({
    resolver: zodResolver(clientDetailsSchema),
    mode: "onTouched",
  });

  // 1. Fetch active service packages
  useEffect(() => {
    async function fetchServices() {
      try {
        setIsLoadingServices(true);
        const res = await fetch("/api/services");
        if (res.ok) {
          const data = await res.json();
          setServices(data);
          if (data.length > 0) {
            setSelectedService((prev) => prev ?? data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  // 2. Fetch slots when date or service changes
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    let isMounted = true;
    async function fetchSlots() {
      try {
        setIsLoadingSlots(true);
        setSelectedSlot(null);
        const res = await fetch(
          `/api/slots?date=${selectedDate}&serviceId=${selectedService!.id}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setSlots(data);
        } else {
          if (isMounted) setSlots([]);
        }
      } catch (err) {
        console.error("Failed to load slots:", err);
        if (isMounted) setSlots([]);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedService]);

  // Step 3 validation submission
  const onSubmitDetails = () => {
    setStep(4);
  };

  // Step 4: Proceed to Payment checkout
  const handleProceedToPayment = async () => {
    if (!selectedService || !selectedSlot) return;

    const details = getValues();
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startTime: selectedSlot.startTime,
          clientName: details.clientName,
          clientEmail: details.clientEmail,
          clientPhone: details.clientPhone,
          notes: details.notes || null,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setCheckoutError(
          "This slot was just locked by another customer. Please select a different time slot."
        );
        setStep(2);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate booking checkout");
      }

      // Redirect to Checkout URL (Stripe or Local Mock)
      window.location.href = data.checkoutUrl;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong during checkout";
      setCheckoutError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: "Select Package" },
    { num: 2, label: "Date & Time" },
    { num: 3, label: "Your Details" },
    { num: 4, label: "Review & Pay" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Effortless Studio Experience
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
            Book Your Photoshoot
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Select your preferred package, reserve an available slot, and confirm instantly.
            No account required.
          </p>
        </div>

        {/* Stepper Progress Bar */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="grid grid-cols-4 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 -z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 -translate-y-1/2 -z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
            {stepsHeader.map((s) => {
              const isPassed = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  className="flex flex-col items-center relative z-10 select-none cursor-pointer"
                  onClick={() => {
                    // Only allow navigating back to completed steps
                    if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4);
                  }}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                      isPassed
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/20"
                        : isCurrent
                        ? "bg-gradient-to-tr from-indigo-500 to-pink-500 text-white shadow-lg shadow-pink-500/30 ring-4 ring-indigo-500/20 scale-110"
                        : "bg-[#141724] text-slate-500 border border-white/10"
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`mt-2 text-[11px] sm:text-xs font-medium transition-colors text-center hidden sm:block ${
                      isCurrent
                        ? "text-white font-semibold"
                        : isPassed
                        ? "text-indigo-300"
                        : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {checkoutError && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-medium">{checkoutError}</p>
          </div>
        )}

        {/* Main Grid: Steps on Left, Sticky Summary Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Wizard Step Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: SELECT PACKAGE */}
            {step === 1 && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      Step 1: Choose Your Package
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Choose the photoshoot session duration and coverage tailored to your needs.
                    </p>
                  </div>
                </div>

                {isLoadingServices ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-sm">Loading studio packages...</p>
                  </div>
                ) : services.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl p-8">
                    <Camera className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
                    <p className="text-base font-semibold text-white">No active packages found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Please check the database seed or add service packages in the Admin Portal.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((pkg) => {
                      const isSelected = selectedService?.id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedService(pkg)}
                          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                            isSelected
                              ? "bg-gradient-to-b from-indigo-950/40 to-indigo-900/20 border-indigo-500/60 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30"
                              : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
                              <Clock className="w-3 h-3" />
                              {pkg.durationMinutes} Mins Session
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{pkg.name}</h3>
                            <p className="text-slate-400 text-xs sm:text-sm line-clamp-3 mb-4 leading-relaxed">
                              {pkg.description}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex items-baseline justify-between mt-auto">
                            <span className="text-xs text-slate-500">Total Investment</span>
                            <span className="text-xl font-extrabold text-white">
                              ${Number(pkg.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Date & Time
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT DATE & TIME SLOT */}
            {step === 2 && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      Step 2: Select Date & Time Slot
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Choose an available calendar day and live time slot for your{" "}
                      <span className="text-indigo-300 font-semibold">{selectedService?.name}</span>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Date Picker */}
                  <div className="md:col-span-6">
                    <BookingCalendar
                      selectedDate={selectedDate}
                      onSelectDate={(newDate) => setSelectedDate(newDate)}
                    />
                  </div>

                  {/* Right Column: Time Slot Grid */}
                  <div className="md:col-span-6 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        Available Slots for {selectedDate}
                      </span>
                    </div>

                    <div className="flex-1 rounded-2xl bg-white/[0.02] border border-white/5 p-4 min-h-[300px] flex flex-col justify-center">
                      {isLoadingSlots ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2 py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                          <p className="text-xs">Calculating studio availability...</p>
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="text-center py-10 px-4">
                          <AlertCircle className="w-8 h-8 text-amber-400/80 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-white">No Slots Available</p>
                          <p className="text-xs text-slate-400 mt-1">
                            The studio is closed or fully booked on this date. Please select another date.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                          {slots.map((slot, index) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            if (slot.available) {
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isSelected
                                      ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400"
                                      : "bg-white/[0.04] text-slate-200 hover:bg-white/10 hover:text-white border border-white/5 hover:border-indigo-500/40"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                  {slot.label}
                                </button>
                              );
                            } else {
                              return (
                                <div
                                  key={index}
                                  className="py-2.5 px-3 rounded-xl text-xs font-medium opacity-40 cursor-not-allowed line-through border border-slate-800 bg-slate-900/40 text-slate-500 text-center flex flex-col items-center justify-center select-none"
                                >
                                  <span>{slot.label}</span>
                                  <span className="text-[9px] uppercase tracking-wider font-semibold no-underline text-rose-400/70">
                                    Booked
                                  </span>
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Client Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: YOUR DETAILS */}
            {step === 3 && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Step 3: Client Information
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Enter your contact details for calendar invitations and photoshoot coordination.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Sarah Jenkins"
                          {...register("clientName")}
                          className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      {errors.clientName && (
                        <p className="mt-1 text-xs text-red-400 font-medium">
                          {errors.clientName.message}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          placeholder="sarah@example.com"
                          {...register("clientEmail")}
                          className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      {errors.clientEmail && (
                        <p className="mt-1 text-xs text-red-400 font-medium">
                          {errors.clientEmail.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone / WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      WhatsApp / Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        placeholder="+60 12-345 6789"
                        {...register("clientPhone")}
                        className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    {errors.clientPhone && (
                      <p className="mt-1 text-xs text-red-400 font-medium">
                        {errors.clientPhone.message}
                      </p>
                    )}
                  </div>

                  {/* Notes / Requests */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Special Requests / Notes (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Outfit styles, prop requirements, or photoshoot concept details..."
                        {...register("notes")}
                        className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex items-center justify-between border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                    >
                      Review Order & Pay
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: ORDER SUMMARY & PAY */}
            {step === 4 && (
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Step 4: Final Review & Checkout
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Review your photoshoot booking details before proceeding to payment.
                  </p>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Package Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Session Package
                    </span>
                    <h4 className="text-base font-bold text-white">{selectedService?.name}</h4>
                    <p className="text-xs text-slate-400">
                      {selectedService?.durationMinutes} mins shoot + {selectedService?.bufferMinutes} mins buffer
                    </p>
                    <div className="pt-2 text-sm font-bold text-white">
                      ${Number(selectedService?.price).toFixed(2)}
                    </div>
                  </div>

                  {/* Scheduled Slot Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Date & Slot
                    </span>
                    <h4 className="text-base font-bold text-white">
                      {selectedDate ? format(parseISO(selectedDate), "EEEE, dd MMMM yyyy") : ""}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Time: <span className="text-white font-semibold">{selectedSlot?.label}</span>
                    </p>
                    <div className="pt-2 inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Slot Available
                    </div>
                  </div>
                </div>

                {/* Client Info Summary */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Client Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Name</span>
                      <span className="text-white font-medium">{getValues("clientName")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Email</span>
                      <span className="text-white font-medium">{getValues("clientEmail")}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone</span>
                      <span className="text-white font-medium">{getValues("clientPhone")}</span>
                    </div>
                  </div>
                  {getValues("notes") && (
                    <div className="pt-2 border-t border-white/5 text-xs">
                      <span className="text-slate-500 block">Notes</span>
                      <span className="text-slate-300 italic">{getValues("notes")}</span>
                    </div>
                  )}
                </div>

                {/* 15-Minute Slot Lock Notice */}
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-white">15-Minute Exclusive Slot Lock</p>
                    <p className="text-slate-400">
                      When you click &quot;Proceed to Payment&quot;, this time window will be held exclusively for you for 15 minutes to guarantee no other customer takes your slot.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-pink-500 hover:opacity-95 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Locking Slot & Connecting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Proceed to Payment (${Number(selectedService?.price || 0).toFixed(2)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Persistent Sticky Summary Card (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-24">
            <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 pb-3 border-b border-white/5">
                Booking Progress Summary
              </h3>

              <div className="space-y-4 text-xs">
                {/* 1. Service Item */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedService
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Package
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {selectedService ? selectedService.name : "None selected"}
                    </span>
                    {selectedService && (
                      <span className="text-slate-400">
                        {selectedService.durationMinutes} minutes session
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Date & Time */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedSlot
                        ? "bg-pink-500/20 text-pink-400"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Date & Slot
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {selectedSlot ? selectedSlot.label : "Slot not chosen"}
                    </span>
                    <span className="text-slate-400">{selectedDate}</span>
                  </div>
                </div>

                {/* 3. Client */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      getValues("clientName")
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                      Client
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {getValues("clientName") || "Guest Customer"}
                    </span>
                    <span className="text-slate-400 truncate block max-w-[180px]">
                      {getValues("clientEmail") || "No email entered"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Total */}
              <div className="mt-6 pt-5 border-t border-white/5 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Total Due
                  </span>
                  <span className="text-xs text-slate-400">Tax included</span>
                </div>
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                  ${selectedService ? Number(selectedService.price).toFixed(2) : "0.00"}
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Instant Google Calendar sync
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Guest self-service management link
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0d14] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Loading studio booking system...</p>
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
