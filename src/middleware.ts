import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public admin auth paths
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login"
  ) {
    // If user is already authenticated and visits /admin/login, redirect to /admin/dashboard
    if (pathname === "/admin/login") {
      const token = request.cookies.get(COOKIE_NAME)?.value;
      if (token) {
        const payload = await verifyAdminToken(token);
        if (payload) {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    const payload = token ? await verifyAdminToken(token) : null;

    if (!payload) {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Unauthorized: Admin session required" },
          { status: 401 }
        );
      }

      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
