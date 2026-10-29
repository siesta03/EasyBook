"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Sliders,
  Clock,
  Bell,
  LogOut,
  Camera,
  Menu,
  X,
  ExternalLink,
  Shield,
  UserCog,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    let ignore = false;
    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/admin/notifications");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.stats) {
            setUnreadNotifications(data.stats.unreadCount || 0);
          }
        }
      } catch {
        // non-blocking
      }
    }
    fetchUnreadCount();
    return () => {
      ignore = true;
    };
  }, [pathname]);

  // If on login page, render clean layout without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Calendar View",
      href: "/admin/calendar",
      icon: Calendar,
    },
    {
      label: "Bookings",
      href: "/admin/bookings",
      icon: CalendarDays,
    },
    {
      label: "Services & Buffers",
      href: "/admin/services",
      icon: Sliders,
    },
    {
      label: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
      badge: unreadNotifications,
    },
    {
      label: "Operating Hours & Blackouts",
      href: "/admin/availability",
      icon: Clock,
    },
    {
      label: "Profile & Integrations",
      href: "/admin/profile",
      icon: UserCog,
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d14] flex flex-col md:flex-row text-slate-100">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0e111a] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Camera className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm">EasyBook Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-[#0d0f18] border-r border-white/5 flex flex-col justify-between shrink-0 fixed md:sticky top-0 h-screen z-40 transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-5">
          {/* Logo */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0d0f18] rounded-[10px] flex items-center justify-center">
                <Camera className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight block">
                Easy<span className="text-indigo-400">Book</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3 text-pink-400" />
                Admin Console
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-pink-500/10 text-white border border-indigo-500/30 shadow-md shadow-indigo-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-indigo-400" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/5 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              Public Booking Site
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Live</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Body */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
