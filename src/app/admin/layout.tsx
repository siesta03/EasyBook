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
      label: "Calendar",
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
      label: "Operating Hours",
      href: "/admin/availability",
      icon: Clock,
    },
    {
      label: "Settings & Alerts",
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
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col md:flex-row text-[#f1f1f1]">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#272727] bg-[#0f0f0f] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#ff0000] flex items-center justify-center text-white shadow-sm">
            <Camera className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">EasyBook</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#272727] text-[#aaaaaa]">
            Studio
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[#aaaaaa] hover:text-white rounded-lg hover:bg-[#272727] cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* YouTube Studio-Style Sidebar */}
      <aside
        className={`w-full md:w-60 bg-[#0f0f0f] border-r border-[#272727] flex flex-col justify-between shrink-0 fixed md:sticky top-0 h-screen z-40 transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="py-4">
          {/* Studio Brand */}
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 px-5 mb-6 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#ff0000] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-white tracking-tight">EasyBook</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#aaaaaa]">
                Studio
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-0.5 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#272727] text-white font-semibold"
                      : "text-[#aaaaaa] hover:text-white hover:bg-[#272727]/50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-[#ff0000]" : "text-[#aaaaaa]"}`}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#cc0000] text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-[#272727] space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-[#aaaaaa] hover:text-white hover:bg-[#272727]/50 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <ExternalLink className="w-3.5 h-3.5 text-[#717171]" />
              Public Booking Page
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#aaaaaa] hover:text-[#ff4e4e] hover:bg-[#272727]/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Body with YouTube Studio Top Bar */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[#272727] bg-[#0f0f0f] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#717171]">Studio /</span>
            <span className="text-xs font-semibold text-white">
              {navItems.find((n) => n.href === pathname)?.label || "Admin"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#272727] hover:bg-[#383838] text-[#f1f1f1] transition-colors"
            >
              <span>View Public Site</span>
              <ExternalLink className="w-3 h-3 text-[#aaaaaa]" />
            </Link>

            <Link
              href="/admin/notifications"
              className="relative p-2 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-white transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff0000]" />
              )}
            </Link>

            <Link
              href="/admin/profile"
              className="w-8 h-8 rounded-full bg-[#272727] hover:bg-[#383838] border border-[#3f3f3f] flex items-center justify-center text-xs font-bold text-white transition-colors"
              title="Admin Settings"
            >
              A
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
