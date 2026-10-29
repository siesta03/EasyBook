"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Send,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  KeyRound,
  History,
  Check,
  Radio,
  HelpCircle,
  Globe,
  BellRing,
  Download,
  Clock,
  CalendarPlus,
} from "lucide-react";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  whatsappNotifyOnCheckout: boolean;
  whatsappNotifyOnConfirm: boolean;
  whatsappNotifyCustomer?: boolean;
  whatsappProvider: string;
  whatsappApiKey: string;
  calendarFeedToken: string;
  calendarFeedUrl: string;
  googleCalendarEmail: string;
  googleCalendarId: string;
  googleServiceAccountEmail: string;
  hasGooglePrivateKey: boolean;
  googleCalendarConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SystemEnvDefaults {
  hasEnvGoogleServiceAccount: boolean;
  envGoogleServiceAccountEmail: string;
  hasEnvGooglePrivateKey: boolean;
  envGoogleCalendarId: string;
}

interface NotificationLog {
  id: string;
  channel: string;
  recipient: string;
  eventType: string;
  message: string;
  status: string;
  metadata: string | null;
  createdAt: string;
}

interface RecentBooking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  startTime: string;
  endTime: string;
  totalAmount: string | number;
  status: string;
  service: { name: string; durationMinutes: number };
}

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testingCalendar, setTestingCalendar] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // WhatsApp State
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappNotifyOnCheckout, setWhatsappNotifyOnCheckout] = useState(true);
  const [whatsappNotifyOnConfirm, setWhatsappNotifyOnConfirm] = useState(true);
  const [whatsappNotifyCustomer, setWhatsappNotifyCustomer] = useState(true);
  const [whatsappProvider, setWhatsappProvider] = useState("callmebot");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");

  // Google Calendar State
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState("");
  const [googleCalendarId, setGoogleCalendarId] = useState("");
  const [googleServiceAccountEmail, setGoogleServiceAccountEmail] = useState("");
  const [googlePrivateKey, setGooglePrivateKey] = useState("");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [calendarFeedUrl, setCalendarFeedUrl] = useState("");
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);

  // System & Logs
  const [envDefaults, setEnvDefaults] = useState<SystemEnvDefaults | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "whatsapp" | "calendar" | "logs">("calendar");

  // Feedback Messages
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);

  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);
  const [copiedServiceEmail, setCopiedServiceEmail] = useState(false);
  const [showAdvancedCredentials, setShowAdvancedCredentials] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    type: "whatsapp" | "calendar";
    message: string;
    directUrl?: string;
    time: string;
    status: string;
  } | null>(null);

  // Fetch admin profile and notifications
  const loadProfile = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/admin/profile");
      if (!res.ok) throw new Error("Failed to load profile data");
      const data = await res.json();

      const p: AdminProfile = data.admin;
      setName(p.name || "");
      setEmail(p.email || "");
      setPhone(p.phone || "");
      setWhatsappNumber(p.whatsappNumber || "");
      setWhatsappEnabled(p.whatsappEnabled);
      setWhatsappNotifyOnCheckout(p.whatsappNotifyOnCheckout);
      setWhatsappNotifyOnConfirm(p.whatsappNotifyOnConfirm);
      setWhatsappNotifyCustomer(p.whatsappNotifyCustomer ?? true);
      setWhatsappProvider(p.whatsappProvider || "callmebot");
      setWhatsappApiKey(p.whatsappApiKey || "");
      setCalendarFeedUrl(p.calendarFeedUrl || "");
      setGoogleCalendarEmail(p.googleCalendarEmail || "");
      setGoogleCalendarId(p.googleCalendarId || "");
      setGoogleServiceAccountEmail(p.googleServiceAccountEmail || "");
      setGoogleCalendarConnected(p.googleCalendarConnected);

      setEnvDefaults(data.systemEnvDefaults || null);
      setLogs(data.recentLogs || []);

      // Fetch recent bookings for 1-click Google Calendar addition
      try {
        const bRes = await fetch("/api/admin/bookings");
        if (bRes.ok) {
          const bData = await bRes.json();
          setRecentBookings(bData.slice(0, 5));
        }
      } catch (bErr) {
        console.error("Failed to load bookings for calendar tab:", bErr);
      }
    } catch (err: unknown) {
      console.error(err);
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error loading profile",
      });
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Save Profile handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

    // Password validation
    if (newPassword) {
      if (newPassword.length < 6) {
        setFeedback({
          type: "error",
          message: "New password must be at least 6 characters.",
        });
        setSavingProfile(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({
          type: "error",
          message: "New password and confirmation do not match.",
        });
        setSavingProfile(false);
        return;
      }
      if (!currentPassword) {
        setFeedback({
          type: "error",
          message: "Please enter your current password to authorize password update.",
        });
        setSavingProfile(false);
        return;
      }
    }

    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        phone,
        whatsappNumber,
        whatsappEnabled,
        whatsappNotifyOnCheckout,
        whatsappNotifyOnConfirm,
        whatsappNotifyCustomer,
        whatsappProvider,
        whatsappApiKey,
        googleCalendarEmail,
        googleCalendarId,
        googleServiceAccountEmail,
      };

      if (googlePrivateKey.trim()) {
        payload.googlePrivateKey = googlePrivateKey.trim();
      }

      if (newPassword && currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setFeedback({
        type: "success",
        message: "Settings saved successfully! " + (whatsappApiKey ? "WhatsApp real delivery is active." : "Note: WhatsApp is in simulation mode until an API key is configured."),
      });

      // Clear password fields on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setGooglePrivateKey("");

      await loadProfile(true);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Test WhatsApp Notification
  const handleTestWhatsApp = async () => {
    if (!whatsappNumber.trim()) {
      setFeedback({
        type: "error",
        message: "Please enter a valid WhatsApp number with country code (e.g. +60189779241) first.",
      });
      return;
    }

    setTestingWhatsApp(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/profile/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappNumber,
          provider: whatsappProvider,
          apiKey: whatsappApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch test notification");
      }

      if (whatsappApiKey && whatsappApiKey.trim()) {
        setFeedback({
          type: "success",
          message: `Live alert dispatched via ${whatsappProvider.toUpperCase()} to +${data.recipient}! Check your WhatsApp now.`,
          actionUrl: data.directUrl,
          actionLabel: "Open WhatsApp Chat",
        });
      } else {
        setFeedback({
          type: "warning",
          message: `Alert recorded in simulation mode because no WhatsApp API Key is configured yet. Click "Open in WhatsApp Web" below to send it with 1 click, or add a free CallMeBot key for automatic phone delivery!`,
          actionUrl: data.directUrl,
          actionLabel: "Open in WhatsApp Web / App",
        });
      }

      setLastTestResult({
        type: "whatsapp",
        message: data.previewText,
        directUrl: data.directUrl,
        time: new Date().toLocaleTimeString(),
        status: whatsappApiKey ? "LIVE SENT" : "SIMULATED",
      });

      if (data.recentLogs) {
        setLogs(data.recentLogs);
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Test WhatsApp alert failed",
      });
    } finally {
      setTestingWhatsApp(false);
    }
  };

  // Test Google Calendar Connection
  const handleTestCalendar = async () => {
    setTestingCalendar(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/profile/test-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailAccount: googleCalendarEmail,
          calendarId: googleCalendarId || googleCalendarEmail,
          serviceAccountEmail: googleServiceAccountEmail,
          privateKey: googlePrivateKey || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFeedback({
          type: "warning",
          message: data.message,
          actionUrl: calendarFeedUrl,
          actionLabel: "Subscribe via Google Calendar Feed (Instant)",
        });
        setGoogleCalendarConnected(false);
      } else {
        setFeedback({
          type: "success",
          message: data.message,
        });
        setGoogleCalendarConnected(!data.isSimulated);
      }

      if (data.recentLogs) {
        setLogs(data.recentLogs);
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Calendar connection test failed",
      });
    } finally {
      setTestingCalendar(false);
    }
  };

  const copyFeedUrl = () => {
    if (!calendarFeedUrl) return;
    navigator.clipboard.writeText(calendarFeedUrl);
    setCopiedFeedUrl(true);
    setTimeout(() => setCopiedFeedUrl(false), 2500);
  };

  const copyServiceEmail = (emailText: string) => {
    if (!emailText) return;
    navigator.clipboard.writeText(emailText);
    setCopiedServiceEmail(true);
    setTimeout(() => setCopiedServiceEmail(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm">Loading administrator profile and integrations...</p>
      </div>
    );
  }

  const activeServiceAccount =
    googleServiceAccountEmail ||
    envDefaults?.envGoogleServiceAccountEmail ||
    "easybook-calendar-service@easybook-studio.iam.gserviceaccount.com";

  const cleanWaNumber = whatsappNumber.replace(/[^\d]/g, "");
  const callMeBotActivationUrl = `https://wa.me/34644205484?text=I%20allow%20callmebot%20to%20send%20me%20messages`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-indigo-400" />
            Admin Profile & Integrations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your account credentials, link your real Google Calendar via Gmail, and configure instant WhatsApp notifications for customer bookings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadProfile(false)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition border border-white/10 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Profile Overview Banner with Honest, Accurate Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-600/30 shrink-0">
              <div className="w-full h-full bg-[#0d0f18] rounded-[14px] flex items-center justify-center">
                <span className="text-xl font-extrabold text-white">
                  {name ? name.charAt(0).toUpperCase() : "A"}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{name || "Studio Administrator"}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Super Admin
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{email}</p>
              
              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Google Calendar Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    googleCalendarConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : googleCalendarEmail
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-800 text-slate-400 border-white/5"
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>
                    Google Calendar:{" "}
                    {googleCalendarConnected
                      ? `Live Connected (${googleCalendarEmail})`
                      : googleCalendarEmail
                      ? `Setup Required (Feed or API)`
                      : "Not Linked"}
                  </span>
                </div>

                {/* WhatsApp Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    whatsappNumber && whatsappEnabled && whatsappApiKey
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : whatsappNumber && whatsappEnabled
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-slate-800 text-slate-400 border-white/5"
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>
                    WhatsApp Alerts:{" "}
                    {whatsappNumber && whatsappEnabled && whatsappApiKey
                      ? `Live Delivery (+${whatsappNumber.replace(/^\+/, "")})`
                      : whatsappNumber && whatsappEnabled
                      ? `Simulation Mode (Add Gateway Key for Phone Delivery)`
                      : "Disabled / Not Set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Alert / Feedback */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-xl border text-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : feedback.type === "warning"
              ? "bg-amber-950/30 border-amber-500/30 text-amber-300"
              : feedback.type === "error"
              ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
              : "bg-indigo-950/30 border-indigo-500/30 text-indigo-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : feedback.type === "warning" ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : feedback.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium leading-relaxed">{feedback.message}</p>
              {feedback.actionUrl && (
                <a
                  href={feedback.actionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {feedback.actionLabel || "View Action Link"}
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/5 space-x-1 sm:space-x-4">
        {[
          { id: "whatsapp", label: "WhatsApp Notifications", icon: MessageSquare },
          { id: "calendar", label: "Google Calendar & Gmail", icon: Calendar },
          { id: "general", label: "Admin Credentials", icon: User },
          { id: "logs", label: "Notification Logs", icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* TAB 1: WHATSAPP NOTIFICATIONS */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      WhatsApp Booking Notification Alerts
                      {whatsappApiKey ? (
                        <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Live Active
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Simulation Mode
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Receive instant WhatsApp notifications whenever a customer adds or confirms a photoshoot booking.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={testingWhatsApp}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {testingWhatsApp ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending Alert...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        Send Test WhatsApp Alert
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CallMeBot 100% Free Setup Box */}
              <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>How to receive real WhatsApp messages on your phone in 30 seconds (100% Free):</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Recommended
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  To send automated messages from this server to your phone without costly enterprise contracts, EasyBook integrates with <strong>CallMeBot</strong> (free personal WhatsApp gateway) and <strong>Fonnte</strong> (popular in Malaysia).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0b0e17] p-3.5 rounded-lg border border-emerald-500/20 space-y-2">
                    <span className="font-bold text-emerald-400 block">Step 1: Activate CallMeBot on WhatsApp</span>
                    <p className="text-slate-400 text-[11px]">
                      From your phone ({whatsappNumber || "+60189779241"}), message CallMeBot on WhatsApp with text:
                    </p>
                    <code className="block bg-black/40 px-2 py-1 rounded text-emerald-300 font-mono text-[11px]">
                      I allow callmebot to send me messages
                    </code>
                    <a
                      href={callMeBotActivationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Click to Message CallMeBot Bot Now
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-[#0b0e17] p-3.5 rounded-lg border border-emerald-500/20 space-y-2">
                    <span className="font-bold text-emerald-400 block">Step 2: Paste the API Key you receive</span>
                    <p className="text-slate-400 text-[11px]">
                      CallMeBot will reply immediately with your personal API Key (e.g. <code>1234567</code>). Paste it into the input below and click &quot;Save Changes&quot;!
                    </p>
                    <div className="pt-1 text-[11px] text-slate-500">
                      That&apos;s it! Every customer booking will now buzz directly on your phone.
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin WhatsApp Number (with Country Code)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 font-mono"
                      placeholder="e.g. +60189779241"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Always include your country code (+60 for Malaysia, +62 for Indonesia, +1 for US).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    WhatsApp Gateway Provider
                  </label>
                  <select
                    value={whatsappProvider}
                    onChange={(e) => setWhatsappProvider(e.target.value)}
                    className="w-full bg-[#131622] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    <option value="callmebot">CallMeBot (100% Free Personal Alerts - Recommended)</option>
                    <option value="fonnte">Fonnte (Malaysia &amp; Indonesia Gateway)</option>
                    <option value="custom">Custom Webhook in .env (WHATSAPP_API_URL)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select your delivery gateway for sending real messages.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Gateway API Key / Token
                  </label>
                  <input
                    type="password"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 font-mono"
                    placeholder="Paste the CallMeBot API Key received on WhatsApp (e.g. 1234567) or Fonnte token"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {whatsappApiKey
                      ? "✅ API Key configured. Real WhatsApp alerts will be delivered directly to your device."
                      : "⚠️ Without an API key, alerts will be simulated in the audit log. Add a CallMeBot key above to receive real alerts on your phone."}
                  </p>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Notification Triggers (Admin &amp; Customer)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Admin: On Booking Hold
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Notify Admin when customer locks a slot.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappNotifyOnCheckout}
                      onChange={(e) => setWhatsappNotifyOnCheckout(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-white/10"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Admin: On Payment Confirmed
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Notify Admin once payment succeeds.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappNotifyOnConfirm}
                      onChange={(e) => setWhatsappNotifyOnConfirm(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-white/10"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Customer: Booking Receipt
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Notify Customer on WhatsApp when booking/confirmed.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappNotifyCustomer}
                      onChange={(e) => setWhatsappNotifyCustomer(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-white/10"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Bubble */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Live Preview of WhatsApp Alert Message:
                </span>
                <div className="max-w-md bg-[#0b141a] p-4 rounded-2xl rounded-tl-sm border border-emerald-500/20 shadow-md font-sans text-xs text-slate-200 space-y-1.5 relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-2">
                    <span className="font-bold text-emerald-400">📸 EasyBook Alert Bot</span>
                    <span className="text-[10px] text-slate-500">Just now</span>
                  </div>
                  <p className="font-bold text-emerald-300">📸 *NEW BOOKING RECEIVED!* ⚡</p>
                  <p className="text-[11px] text-slate-400">━━━━━━━━━━━━━━━━━━</p>
                  <p>👤 *Client:* Azfar</p>
                  <p>📞 *Phone:* +60189779241</p>
                  <p>✉️ *Email:* azfar@example.com</p>
                  <p className="pt-1">🏷️ *Category:* Indoor Photoshoot</p>
                  <p>📦 *Package:* Full Studio Editorial &amp; Fashion (150m + 30m buffer)</p>
                  <p>📅 *Date:* Saturday, Oct 24, 2026</p>
                  <p>⏰ *Time:* 02:00 PM - 04:30 PM</p>
                  <p>💵 *Amount:* RM 580.00</p>
                  <p className="text-[11px] text-slate-400">━━━━━━━━━━━━━━━━━━</p>
                  <p className="text-amber-400">⏳ *Status:* Pending Payment (15-min hold)</p>
                  <p className="text-indigo-400 underline">🔗 View in Admin Calendar</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE CALENDAR & GMAIL */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            {/* Localhost Explanation Alert */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Why did Google Calendar say &quot;Could not fetch URL&quot;?</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                You are currently running EasyBook on <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">http://localhost:3000</code>. Google&apos;s cloud servers (at <code>google.com</code>) cannot connect to your private computer&apos;s localhost address.
              </p>
              <p className="text-slate-300 font-medium">
                👉 To sync your photoshoot bookings into Google Calendar while developing locally, use <strong>Option 1 (Download &amp; Import)</strong> or <strong>Option 2 (1-Click Add Event)</strong> below — both work 100% on localhost!
              </p>
            </div>

            {/* OPTION 1: DOWNLOAD & IMPORT .ICS (100% WORKING ON LOCALHOST) */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-blue-950/30 to-slate-900 border border-blue-500/30 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Option 1: Download &amp; Import (.ics File)
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                        Works 100% on Localhost
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Download your photoshoot schedule file and import it directly into your Google Calendar on <strong>{googleCalendarEmail || "your Gmail"}</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/calendar/feed?download=true"
                    download="easybook-schedule.ics"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Calendar (.ics)
                  </a>
                  <a
                    href="https://calendar.google.com/calendar/r/settings/export"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Google Calendar Import
                  </a>
                </div>
              </div>

              {/* 3-Step Guide for Import */}
              <div className="bg-[#0b0e17] p-4 rounded-xl border border-white/5 space-y-2 text-xs text-slate-300">
                <span className="font-bold text-white block">Simple 2-Step Import:</span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>
                    Click the green <strong>&quot;Download Calendar (.ics)&quot;</strong> button above to save your photoshoot bookings file.
                  </li>
                  <li>
                    Click <strong>&quot;Open Google Calendar Import&quot;</strong>, select the downloaded file, choose your calendar (<code>{googleCalendarEmail || "haziqamani579@gmail.com"}</code>), and click <strong>&quot;Import&quot;</strong>.
                  </li>
                  <li>
                    <strong>Done!</strong> All your sessions appear in Google Calendar immediately across your phone and laptop!
                  </li>
                </ol>
              </div>
            </div>

            {/* OPTION 2: 1-CLICK ADD RECENT BOOKINGS TO GOOGLE CALENDAR */}
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Option 2: 1-Click Add Bookings to Google Calendar
                    </h3>
                    <p className="text-xs text-slate-400">
                      Click below to immediately open and save any photoshoot reservation into your Google Calendar.
                    </p>
                  </div>
                </div>
              </div>

              {recentBookings.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No bookings found yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {recentBookings.map((b) => {
                    const startD = new Date(b.startTime);
                    const endD = new Date(b.endTime);
                    const formatUtc = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
                    const dates = `${formatUtc(startD)}/${formatUtc(endD)}`;
                    const title = `Photoshoot: ${b.clientName} - ${b.service.name}`;
                    const details = `Client: ${b.clientName}\nPhone: ${b.clientPhone}\nEmail: ${b.clientEmail}\nService: ${b.service.name}`;
                    const addUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=Studio`;

                    return (
                      <div
                        key={b.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs sm:text-sm">{b.clientName}</span>
                            <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {b.service.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                b.status === "CONFIRMED"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {startD.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })} at {startD.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>

                        <a
                          href={addUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-semibold transition shrink-0"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                          Add to Google Calendar
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* OPTION 3: FOR DEPLOYED WEBSITES (OR LOCALTUNNEL) */}
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Option 3: Auto-Sync via &quot;From URL&quot; (Production &amp; Tunnels)
                    </h3>
                    <p className="text-xs text-slate-400">
                      When your website is deployed live on a public domain, Google Calendar can automatically subscribe and update in the background.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Your Calendar Subscription Feed URL:
                </label>
                <div className="flex items-center gap-2 bg-[#0a0d16] p-2.5 rounded-xl border border-white/10">
                  <input
                    type="text"
                    readOnly
                    value={calendarFeedUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/feed`}
                    className="w-full bg-transparent text-xs text-blue-200 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyFeedUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer"
                  >
                    {copiedFeedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 space-y-2">
                <span className="font-semibold text-white block">
                  Want to test &quot;From URL&quot; on localhost right now?
                </span>
                <p>
                  Run this command in a new terminal window to give localhost a temporary public URL:
                </p>
                <code className="block bg-black/40 px-3 py-1.5 rounded text-indigo-300 font-mono text-[11px]">
                  npx localtunnel --port 3000
                </code>
                <p>
                  Then copy the generated <code>https://...loca.lt</code> address and append <code>/api/calendar/feed?token=...</code> to paste into Google Calendar.
                </p>
              </div>
            </div>

            {/* Direct Google Cloud API Sync (Optional) */}
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Google Service Account Direct API (Advanced)
                    </h3>
                    <p className="text-xs text-slate-400">
                      If you want EasyBook to programmatically create events directly via Google Cloud Calendar API (v3).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestCalendar}
                  disabled={testingCalendar}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {testingCalendar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing API...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      Test Google API Connection
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Real Gmail Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={googleCalendarEmail}
                      onChange={(e) => setGoogleCalendarEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                      placeholder="e.g. haziqamani579@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Google Calendar ID
                  </label>
                  <input
                    type="text"
                    value={googleCalendarId}
                    onChange={(e) => setGoogleCalendarId(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="Leave blank to default to your Gmail address"
                  />
                </div>
              </div>

              {/* Service Account Setup Instructions */}
              <div className="border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvancedCredentials(!showAdvancedCredentials)}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showAdvancedCredentials ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Configure Google Cloud Service Account &amp; RSA Key (Optional)</span>
                </button>

                {showAdvancedCredentials && (
                  <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="text-xs text-slate-400 space-y-2">
                      <p>
                        To use direct backend API event creation, you must create a Service Account in the Google Cloud Console, share your Google Calendar with the Service Account email, and paste its credentials below:
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Google Cloud Service Account Email
                      </label>
                      <input
                        type="text"
                        value={googleServiceAccountEmail}
                        onChange={(e) => setGoogleServiceAccountEmail(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 font-mono"
                        placeholder="your-service-account@project.iam.gserviceaccount.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Google RSA Private Key (PEM format)
                      </label>
                      <textarea
                        rows={3}
                        value={googlePrivateKey}
                        onChange={(e) => setGooglePrivateKey(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 font-mono"
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN CREDENTIALS */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Profile Information</h3>
                    <p className="text-xs text-slate-400">
                      Update your administrator name and login credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="e.g. Studio Administrator"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin Login Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="admin@easybook.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Studio Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="e.g. +60189779241"
                  />
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Security &amp; Password</h3>
                  <p className="text-xs text-slate-400">
                    Leave blank if you do not wish to change your admin password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="Min 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATION LOGS */}
        {activeTab === "logs" && (
          <div className="bg-[#131622] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Recent Notification &amp; Sync Logs</h3>
                  <p className="text-xs text-slate-400">
                    Audit trail showing status: <strong>SENT</strong> (Live phone delivery), <strong>SIMULATED</strong> (Logged without gateway key), or <strong>FAILED</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadProfile(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reload
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No notification logs recorded yet. Send a test WhatsApp message or simulate a booking to see activity.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Channel</th>
                      <th className="py-2.5 px-3 font-semibold">Event</th>
                      <th className="py-2.5 px-3 font-semibold">Recipient</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Message Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {logs.map((log) => {
                      const dateStr = new Date(log.createdAt).toLocaleString();
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {dateStr}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                log.channel === "WHATSAPP"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {log.channel === "WHATSAPP" ? (
                                <MessageSquare className="w-2.5 h-2.5" />
                              ) : (
                                <Calendar className="w-2.5 h-2.5" />
                              )}
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                            {log.eventType}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                            {log.recipient}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === "SENT" || log.status === "DELIVERED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : log.status === "SIMULATED"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {log.status === "SENT" ? "LIVE DELIVERED" : log.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-400" title={log.message}>
                            {log.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action Save Bar */}
        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <div className="text-xs text-slate-500">
            Changes will take effect immediately upon saving.
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Profile Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
