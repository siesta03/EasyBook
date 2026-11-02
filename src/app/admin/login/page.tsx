"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("admin@easybook.com");
    setPassword("admin123456");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-[#1a1a1a] p-8 sm:p-10 rounded-2xl border border-[#2a2a2a] shadow-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-11 h-11 rounded-xl bg-[#cc0000] flex items-center justify-center text-white shadow-md">
              <Camera className="w-6 h-6" />
            </div>
          </Link>
          <h1 className="text-xl font-bold text-[#f1f1f1] tracking-tight">
            EasyBook Studio
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-1">
            Sign in to manage studio bookings, packages, and calendar slots.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-[#2e1414] border border-[#521c1c] text-[#fca5a5] text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717171]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@easybook.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] placeholder-[#717171] text-xs focus:outline-none focus:border-[#3ea6ff] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#717171]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] placeholder-[#717171] text-xs focus:outline-none focus:border-[#3ea6ff] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#717171] hover:text-[#f1f1f1] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials Helper */}
        <div className="mt-6 pt-5 border-t border-[#2a2a2a] text-center">
          <p className="text-[11px] text-[#717171] mb-1.5">Default Setup Credentials:</p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="inline-flex items-center gap-1.5 text-xs text-[#3ea6ff] hover:underline cursor-pointer font-medium"
          >
            <span>admin@easybook.com / admin123456</span>
          </button>
        </div>
      </div>
    </div>
  );
}
