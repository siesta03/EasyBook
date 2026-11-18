"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  RefreshCw,
  Copy,
  KeyRound,
  History,
  Check,
  Globe,
  BellRing,
} from "lucide-react";

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNotifyOnCheckout: boolean;
  whatsappNotifyOnConfirm: boolean;
  telegramEnabled?: boolean;
  hasTelegramBotToken?: boolean;
  telegramChatId?: string;
  emailNotifyCustomer?: boolean;
  calendarFeedToken: string;
  calendarFeedUrl: string;
}

interface SystemEnvDefaults {
  hasEnvTelegramBotToken?: boolean;
  hasEnvTelegramChatId?: boolean;
  emailConfigured?: boolean;
  emailProvider?: "brevo" | "resend" | "none";
  emailFrom?: string;
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

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Telegram (Admin alerts only) & Customer Email (Token Invitation) State
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [hasTelegramBotToken, setHasTelegramBotToken] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramBotUsername, setTelegramBotUsername] = useState("");
  const [notifyOnHold, setNotifyOnHold] = useState(true);
  const [notifyOnConfirm, setNotifyOnConfirm] = useState(true);
  const [emailNotifyCustomer, setEmailNotifyCustomer] = useState(true);
  const [detectingChatId, setDetectingChatId] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");

  // Google Calendar (Tunnel Feed URL only)
  const [calendarFeedToken, setCalendarFeedToken] = useState("");
  const [calendarFeedUrl, setCalendarFeedUrl] = useState("");
  const [tunnelBaseUrl, setTunnelBaseUrl] = useState("");
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  // System & Logs
  const [envDefaults, setEnvDefaults] = useState<SystemEnvDefaults | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<"alerts" | "calendar" | "general" | "logs">("alerts");

  // Feedback Messages
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
  } | null>(null);

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
      setNotifyOnHold(p.whatsappNotifyOnCheckout);
      setNotifyOnConfirm(p.whatsappNotifyOnConfirm);
      setTelegramEnabled(p.telegramEnabled ?? false);
      setHasTelegramBotToken(!!p.hasTelegramBotToken);
      setTelegramChatId(p.telegramChatId || "");
      setEmailNotifyCustomer(p.emailNotifyCustomer ?? true);
      setTestEmailTo(p.email || "");
      setCalendarFeedToken(p.calendarFeedToken || "");
      setCalendarFeedUrl(p.calendarFeedUrl || "");

      setEnvDefaults(data.systemEnvDefaults || null);
      setLogs(data.recentLogs || []);
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
    let ignore = false;
    async function initProfile() {
      try {
        const res = await fetch("/api/admin/profile");
        if (!res.ok) throw new Error("Failed to load profile data");
        const data = await res.json();
        if (ignore) return;

        const p: AdminProfile = data.admin;
        setName(p.name || "");
        setEmail(p.email || "");
        setPhone(p.phone || "");
        setNotifyOnHold(p.whatsappNotifyOnCheckout);
        setNotifyOnConfirm(p.whatsappNotifyOnConfirm);
        setTelegramEnabled(p.telegramEnabled ?? false);
        setHasTelegramBotToken(!!p.hasTelegramBotToken);
        setTelegramChatId(p.telegramChatId || "");
        setEmailNotifyCustomer(p.emailNotifyCustomer ?? true);
        setTestEmailTo(p.email || "");
        setCalendarFeedToken(p.calendarFeedToken || "");
        setCalendarFeedUrl(p.calendarFeedUrl || "");

        setEnvDefaults(data.systemEnvDefaults || null);
        setLogs(data.recentLogs || []);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const tab = params.get("tab");
          if (
            tab === "alerts" ||
            tab === "calendar" ||
            tab === "general" ||
            tab === "logs"
          ) {
            setActiveTab(tab);
          }
        }
      } catch (err: unknown) {
        console.error(err);
        if (!ignore) {
          setFeedback({
            type: "error",
            message: err instanceof Error ? err.message : "Error loading profile",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    initProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);

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
        whatsappNotifyOnCheckout: notifyOnHold,
        whatsappNotifyOnConfirm: notifyOnConfirm,
        telegramEnabled,
        telegramChatId,
        emailNotifyCustomer,
      };

      if (telegramBotToken.trim()) {
        payload.telegramBotToken = telegramBotToken.trim();
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
        message: "Settings saved successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTelegramBotToken("");

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

  const handleDetectChatId = async () => {
    setDetectingChatId(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/profile/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detect",
          botToken: telegramBotToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.botUsername) setTelegramBotUsername(data.botUsername);
      if (!res.ok) throw new Error(data.error || "Could not detect chat ID");
      setTelegramChatId(data.chatId);
      setTelegramEnabled(true);
      setFeedback({
        type: "success",
        message: `Found chat ID ${data.chatId}${data.chatName ? ` (${data.chatName})` : ""}. Click "Save Changes", then "Send Test Telegram Alert".`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: "warning",
        message: err instanceof Error ? err.message : "Could not detect chat ID",
      });
    } finally {
      setDetectingChatId(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/profile/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          botToken: telegramBotToken.trim() || undefined,
          chatId: telegramChatId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram test failed");
      setFeedback({ type: "success", message: "Test alert sent! Check your Telegram app." });
      await loadProfile(true);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Telegram test failed",
      });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/profile/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailTo.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Email test failed");
      setFeedback({
        type: "success",
        message: `${data.message}. Check your inbox (and spam folder).`,
      });
      await loadProfile(true);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Email test failed",
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const cleanTunnel = tunnelBaseUrl.trim().replace(/\/+$/, "");
  const effectiveFeedUrl = cleanTunnel
    ? `${cleanTunnel}/api/calendar/feed?token=${calendarFeedToken || "default"}`
    : calendarFeedUrl || `http://localhost:3000/api/calendar/feed?token=${calendarFeedToken || "default"}`;

  const copyFeedUrl = () => {
    if (!effectiveFeedUrl) return;
    navigator.clipboard.writeText(effectiveFeedUrl);
    setCopiedFeedUrl(true);
    setTimeout(() => setCopiedFeedUrl(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#aaaaaa]">
        <Loader2 className="w-8 h-8 animate-spin text-[#aaaaaa] mb-3" />
        <p className="text-xs">Loading settings &amp; integrations...</p>
      </div>
    );
  }

  const telegramConnected =
    telegramEnabled &&
    (hasTelegramBotToken || !!envDefaults?.hasEnvTelegramBotToken) &&
    !!telegramChatId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] tracking-tight">
            Settings &amp; Integrations
          </h1>
          <p className="text-[#aaaaaa] text-xs mt-1">
            Configure Admin Telegram bot alerts, Customer Token-Based Email invitations, and Google Calendar tunnel sync.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadProfile(false)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1f1f1f] hover:bg-[#272727] text-[#f1f1f1] rounded-full text-xs font-medium transition border border-[#2a2a2a] cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#aaaaaa]" />
          Refresh
        </button>
      </div>

      {/* Profile Overview Header */}
      <div className="rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#cc0000] text-white font-bold flex items-center justify-center text-lg shrink-0">
              {name ? name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#f1f1f1]">
                  {name || "Studio Administrator"}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#272727] text-[#aaaaaa] border border-[#383838]">
                  <ShieldCheck className="w-3 h-3 text-[#aaaaaa]" />
                  Admin
                </span>
              </div>
              <p className="text-xs text-[#aaaaaa] mt-0.5">{email}</p>

              {/* Dynamic Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                    telegramConnected
                      ? "bg-[#0e2a1b] text-[#4ade80] border-[#164e2d]"
                      : "bg-[#2a220e] text-[#facc15] border-[#544315]"
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>
                    Telegram Bot: {telegramConnected ? "Connected" : "Setup Required"}
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                    emailNotifyCustomer
                      ? "bg-[#0e2a1b] text-[#4ade80] border-[#164e2d]"
                      : "bg-[#272727] text-[#aaaaaa] border-[#383838]"
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>
                    Customer Email:{" "}
                    {emailNotifyCustomer
                      ? envDefaults?.emailProvider === "brevo"
                        ? "Token Invite Active (Brevo Connected)"
                        : envDefaults?.emailProvider === "resend"
                        ? "Token Invite Active (Resend Connected)"
                        : envDefaults?.emailConfigured
                        ? "Token Invite Active (Email Connected)"
                        : "Token Invite Active (Token Link Mode)"
                      : "Disabled"}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[#142330] text-[#38bdf8] border-[#1d3d57]">
                  <Calendar className="w-3 h-3" />
                  <span>Google Calendar: Tunnel Feed Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-xl border text-xs ${
            feedback.type === "success"
              ? "bg-[#0e2a1b] border-[#164e2d] text-[#86efac]"
              : feedback.type === "warning"
              ? "bg-[#2a220e] border-[#544315] text-[#fde047]"
              : feedback.type === "error"
              ? "bg-[#2e1414] border-[#521c1c] text-[#fca5a5]"
              : "bg-[#1a1a1a] border-[#2a2a2a] text-[#f1f1f1]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <p className="font-medium leading-relaxed">{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[#aaaaaa] hover:text-[#f1f1f1] text-xs cursor-pointer ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#2a2a2a] space-x-1 sm:space-x-4 overflow-x-auto no-scrollbar">
        {[
          { id: "alerts", label: "Telegram & Email Alerts", icon: BellRing },
          { id: "calendar", label: "Google Calendar (Tunnel)", icon: Calendar },
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
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-[#f1f1f1] text-[#f1f1f1] font-semibold"
                  : "border-transparent text-[#aaaaaa] hover:text-[#f1f1f1] hover:border-[#383838]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#f1f1f1]" : "text-[#717171]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* TAB 0: TELEGRAM (ADMIN) & TOKEN INVITATION EMAIL (CUSTOMER) */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            {/* How booking notifications work */}
            <div className="p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#aaaaaa] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#f1f1f1] text-xs uppercase tracking-wider">
                <BellRing className="w-4 h-4 text-[#ff4e4e]" />
                <span>Notification Workflow</span>
              </div>
              <p>
                <strong className="text-[#f1f1f1]">Admin Role:</strong> Receives all booking notifications exclusively via <strong>Telegram Bot</strong> (new holds, confirmations, reschedules, cancellations).
              </p>
              <p>
                <strong className="text-[#f1f1f1]">Customer Role:</strong> Receives a <strong>Token-Based Invitation Email</strong> when their booking is confirmed, listing all booking details and their direct link (<code className="text-[#f1f1f1]">/booking/manage/[token]</code>) to manage their session.
              </p>
            </div>

            {/* TELEGRAM CARD (ADMIN ONLY) */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#142330] text-[#38bdf8] flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#f1f1f1] flex items-center gap-2">
                      Telegram Admin Alerts
                      {telegramConnected ? (
                        <span className="text-[10px] uppercase font-bold bg-[#0e2a1b] text-[#4ade80] border border-[#164e2d] px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold bg-[#2a220e] text-[#facc15] border border-[#544315] px-2 py-0.5 rounded-full">
                          Not Set Up
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#aaaaaa]">
                      Direct official Telegram Bot API for all studio admin booking alerts.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-[#f1f1f1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#121212] border-[#2a2a2a]"
                  />
                  Enable Telegram alerts
                </label>
              </div>

              {/* 3-Step Setup */}
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <li className="bg-[#121212] p-3.5 rounded-xl border border-[#2a2a2a] space-y-1">
                  <span className="font-semibold text-[#38bdf8] block">Step 1: Create your bot</span>
                  <p className="text-[#aaaaaa] text-[11px] leading-relaxed">
                    Open{" "}
                    <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#3ea6ff] underline">
                      @BotFather
                    </a>{" "}
                    in Telegram, send <code className="text-[#f1f1f1]">/newbot</code>, and pick a bot username ending in <code className="text-[#f1f1f1]">bot</code>.
                  </p>
                </li>
                <li className="bg-[#121212] p-3.5 rounded-xl border border-[#2a2a2a] space-y-1">
                  <span className="font-semibold text-[#38bdf8] block">Step 2: Paste Bot Token</span>
                  <p className="text-[#aaaaaa] text-[11px] leading-relaxed">
                    Copy the token from BotFather (e.g. <code className="text-[#f1f1f1]">123456789:AAH...</code>) and paste it below.
                  </p>
                </li>
                <li className="bg-[#121212] p-3.5 rounded-xl border border-[#2a2a2a] space-y-1">
                  <span className="font-semibold text-[#38bdf8] block">Step 3: Start &amp; Detect</span>
                  <p className="text-[#aaaaaa] text-[11px] leading-relaxed">
                    Open your bot
                    {telegramBotUsername ? (
                      <>
                        {" "}(
                        <a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noreferrer" className="text-[#3ea6ff] underline">
                          @{telegramBotUsername}
                        </a>
                        )
                      </>
                    ) : null}
                    , press <strong>START</strong>, then click <strong>Detect Chat ID</strong>.
                  </p>
                </li>
              </ol>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Bot Token
                  </label>
                  <input
                    type="password"
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff] font-mono"
                    placeholder={
                      hasTelegramBotToken
                        ? "•••••••• saved (paste a new one to replace)"
                        : envDefaults?.hasEnvTelegramBotToken
                        ? "Using TELEGRAM_BOT_TOKEN from environment"
                        : "123456789:AAH..."
                    }
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Your Chat ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="flex-1 bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff] font-mono"
                      placeholder="Click Detect →"
                    />
                    <button
                      type="button"
                      onClick={handleDetectChatId}
                      disabled={detectingChatId}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#272727] hover:bg-[#333333] text-[#f1f1f1] border border-[#383838] rounded-full text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      {detectingChatId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Detect Chat ID
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Telegram Trigger Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#2a2a2a] cursor-pointer">
                  <span>
                    <span className="text-xs font-semibold text-[#f1f1f1] block">On booking hold</span>
                    <span className="text-[11px] text-[#717171]">Alert Admin when customer locks a slot.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyOnHold}
                    onChange={(e) => setNotifyOnHold(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#121212] border-[#2a2a2a]"
                  />
                </label>
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#121212] border border-[#2a2a2a] cursor-pointer">
                  <span>
                    <span className="text-xs font-semibold text-[#f1f1f1] block">On payment confirmed</span>
                    <span className="text-[11px] text-[#717171]">Alert Admin when confirmed, rescheduled, or cancelled.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyOnConfirm}
                    onChange={(e) => setNotifyOnConfirm(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#121212] border-[#2a2a2a]"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#272727] hover:bg-[#333333] border border-[#383838] text-[#f1f1f1] rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {testingTelegram ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#38bdf8]" />
                  )}
                  Send Test Telegram Alert
                </button>
              </div>
            </div>

            {/* CUSTOMER EMAIL INVITATION CARD (TOKEN-BASED INVITATION PATTERN) */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2a2a] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2e1823] text-[#f472b6] flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#f1f1f1] flex items-center gap-2">
                      Customer Token-Based Email Invitations
                      {envDefaults?.emailProvider === "brevo" ? (
                        <span className="text-[10px] uppercase font-bold bg-[#0e2a1b] text-[#4ade80] border border-[#164e2d] px-2 py-0.5 rounded-full">
                          Brevo Connected (300/day Free)
                        </span>
                      ) : envDefaults?.emailProvider === "resend" ? (
                        <span className="text-[10px] uppercase font-bold bg-[#0e2a1b] text-[#4ade80] border border-[#164e2d] px-2 py-0.5 rounded-full">
                          Resend Connected
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold bg-[#2a220e] text-[#facc15] border border-[#544315] px-2 py-0.5 rounded-full">
                          Needs BREVO_API_KEY
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#aaaaaa]">
                      Automatically emails confirmed customers their booking summary &amp; private token link (<code className="text-[#f1f1f1]">/booking/manage/[token]</code>) to the exact email they used when booking.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-[#f1f1f1] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifyCustomer}
                    onChange={(e) => setEmailNotifyCustomer(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#121212] border-[#2a2a2a]"
                  />
                  Email customer on confirmation
                </label>
              </div>

              <div className="p-4 rounded-xl bg-[#121212] border border-[#2a2a2a] space-y-2 text-xs text-[#aaaaaa]">
                <span className="font-semibold text-[#f1f1f1] block">
                  How Customer Token-Based Email Invitations work:
                </span>
                <p className="leading-relaxed">
                  1. When a customer completes a photoshoot booking, EasyBook generates a unique passwordless token (<code className="text-[#f1f1f1]">manageToken</code>).
                </p>
                <p className="leading-relaxed">
                  2. An automated invitation email is dispatched to the customer&apos;s email with their package details, slot time, RM price, and direct link to their booking page.
                </p>
                <p className="leading-relaxed">
                  3. <strong>Brevo (Recommended):</strong> Add <code className="text-[#f1f1f1]">BREVO_API_KEY</code> and <code className="text-[#f1f1f1]">BREVO_SENDER_EMAIL</code> to Vercel/env to email any customer immediately without purchasing a domain.
                </p>
              </div>

              <div className="text-[11px] text-[#717171]">
                Sender: <code className="text-[#aaaaaa]">{envDefaults?.emailFrom || "EasyBook Studio <haziqamani509@gmail.com>"}</code>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                  <input
                    type="email"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="sm:w-72 bg-[#121212] border border-[#2a2a2a] rounded-full px-4 py-2 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="Send test invitation to..."
                  />
                  <button
                    type="button"
                    onClick={handleTestEmail}
                    disabled={testingEmail}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#272727] hover:bg-[#333333] border border-[#383838] text-[#f1f1f1] rounded-full text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {testingEmail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-[#f472b6]" />
                    )}
                    Send Test Token Email
                  </button>
                </div>
                <p className="text-[11px] text-[#717171] mt-1 text-right">
                  Tip: With Brevo configured, enter any recipient email to test instant delivery.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE CALENDAR (TUNNEL / FEED URL ONLY) */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-[#2a2a2a] pb-4">
                <div className="w-10 h-10 rounded-xl bg-[#142330] text-[#38bdf8] flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f1f1]">
                    Google Calendar Auto-Sync (Tunnel / Feed URL)
                  </h3>
                  <p className="text-xs text-[#aaaaaa]">
                    Subscribe your Google Calendar directly to your live photoshoot feed via a public tunnel URL or production domain.
                  </p>
                </div>
              </div>

              {/* Optional Tunnel Public URL Override */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
                  Tunnel Public URL (Optional — e.g. from localtunnel or ngrok)
                </label>
                <input
                  type="url"
                  value={tunnelBaseUrl}
                  onChange={(e) => setTunnelBaseUrl(e.target.value)}
                  placeholder="https://your-subdomain.loca.lt"
                  className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] font-mono focus:outline-none focus:border-[#3ea6ff]"
                />
                <p className="text-[11px] text-[#717171]">
                  Paste your active tunnel address here to automatically build your public Google Calendar subscription link below.
                </p>
              </div>

              {/* Generated Calendar Subscription Feed URL */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider">
                  Calendar Subscription Feed URL
                </label>
                <div className="flex items-center gap-2 bg-[#121212] p-2.5 rounded-xl border border-[#2a2a2a]">
                  <input
                    type="text"
                    readOnly
                    value={effectiveFeedUrl}
                    className="w-full bg-transparent text-xs text-[#38bdf8] font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyFeedUrl}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#272727] hover:bg-[#333333] text-[#f1f1f1] rounded-full text-xs font-semibold transition shrink-0 cursor-pointer border border-[#383838]"
                  >
                    {copiedFeedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                        <span className="text-[#4ade80]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#aaaaaa]" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3-Step Tunnel Setup Instructions */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#2a2a2a] text-xs text-[#aaaaaa] space-y-2.5">
                <span className="font-semibold text-[#f1f1f1] block">
                  How to connect via Tunnel in Google Calendar:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    Run <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-[#f1f1f1] border border-[#2a2a2a]">npx localtunnel --port 3000</code> in your terminal to expose localhost publicly.
                  </li>
                  <li>
                    Paste the generated <code className="text-[#f1f1f1]">https://...loca.lt</code> URL into the <strong>Tunnel Public URL</strong> field above and click <strong>Copy URL</strong>.
                  </li>
                  <li>
                    Open <strong>Google Calendar → Settings → Add calendar → From URL</strong> and paste the copied feed URL.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADMIN CREDENTIALS */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-[#2a2a2a] pb-4">
                <div className="w-9 h-9 rounded-xl bg-[#272727] text-[#f1f1f1] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f1f1]">Profile Information</h3>
                  <p className="text-xs text-[#aaaaaa]">
                    Update your administrator name and login credentials.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="e.g. Studio Administrator"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Admin Login Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="admin@easybook.com"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Studio Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="e.g. +60189779241"
                  />
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-[#2a2a2a] pb-4">
                <div className="w-9 h-9 rounded-xl bg-[#272727] text-[#ff4e4e] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f1f1]">Security &amp; Password</h3>
                  <p className="text-xs text-[#aaaaaa]">
                    Leave blank if you do not wish to change your admin password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="Min 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-xl px-3.5 py-2.5 text-xs text-[#f1f1f1] placeholder:text-[#717171] focus:outline-none focus:border-[#3ea6ff]"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATION LOGS */}
        {activeTab === "logs" && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#272727] text-[#aaaaaa] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f1f1f1]">Recent Notification Logs</h3>
                  <p className="text-xs text-[#aaaaaa]">
                    Audit trail of Telegram admin alerts and Customer Token-Based Email invitations.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadProfile(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#272727] hover:bg-[#333333] text-[#f1f1f1] rounded-full text-xs font-medium cursor-pointer border border-[#383838]"
              >
                <RefreshCw className="w-3 h-3" />
                Reload
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12 text-[#717171] text-xs">
                No notification logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141414] text-[#717171] border-b border-[#2a2a2a] uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Channel</th>
                      <th className="py-2.5 px-3 font-semibold">Event</th>
                      <th className="py-2.5 px-3 font-semibold">Recipient</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Message Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222] text-[#aaaaaa]">
                    {logs.map((log) => {
                      const dateStr = new Date(log.createdAt).toLocaleString();
                      return (
                        <tr key={log.id} className="hover:bg-[#202020]">
                          <td className="py-3 px-3 whitespace-nowrap text-[#717171] font-mono text-[11px]">
                            {dateStr}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                log.channel === "TELEGRAM"
                                  ? "bg-[#142330] text-[#38bdf8] border-[#1d3d57]"
                                  : log.channel === "EMAIL"
                                  ? "bg-[#2e1823] text-[#f472b6] border-[#4c2236]"
                                  : "bg-[#272727] text-[#aaaaaa] border-[#383838]"
                              }`}
                            >
                              {log.channel === "TELEGRAM" ? (
                                <Send className="w-2.5 h-2.5" />
                              ) : log.channel === "EMAIL" ? (
                                <Mail className="w-2.5 h-2.5" />
                              ) : (
                                <Calendar className="w-2.5 h-2.5" />
                              )}
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#f1f1f1]">
                            {log.eventType}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px] text-[#aaaaaa]">
                            {log.recipient}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === "SENT" || log.status === "DELIVERED"
                                  ? "bg-[#0e2a1b] text-[#4ade80]"
                                  : log.status === "SIMULATED"
                                  ? "bg-[#2a220e] text-[#facc15]"
                                  : "bg-[#2e1414] text-[#f87171]"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-[#aaaaaa]" title={log.message}>
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
        <div className="flex items-center justify-between border-t border-[#2a2a2a] pt-5">
          <div className="text-xs text-[#717171]">
            Changes take effect immediately upon saving.
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold text-xs rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
