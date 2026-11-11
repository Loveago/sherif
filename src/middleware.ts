import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cleanDomain } from "@/lib/storefront-utils";

const SESSION_COOKIE = "cleandatapacks_session";
const secretString = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-replace-in-prod";
const secret = new TextEncoder().encode(secretString);

const ADMIN_ONLY_PREFIXES = [
  "/admin/users",
  "/admin/settings",
  "/admin/api",
  "/admin/audit-logs",
  "/admin/pricing",
  "/admin/packages",
];

const MAIN_DOMAIN = cleanDomain(
  process.env.MAIN_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN,
  "cleandatapacks.com"
);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = cleanDomain(rawHost);
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  // Friendly /@slug redirects/rewrites to /store/:slug on the same domain
  if (pathname.startsWith("/@")) {
    const slug = pathname.slice(2).replace(/\/+$/, "");
    if (/^[a-z0-9-]{3,32}$/.test(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/store/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // On localhost, allow clean direct /:slug testing (e.g. http://localhost:3000/my-store)
  const RESERVED_PATHS = new Set([
    "admin",
    "dashboard",
    "api",
    "v1",
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "store",
    "terms",
    "terms-of-service",
    "privacy",
    "privacy-policy",
    "refund-policy",
    "refunds",
    "cancellation-policy",
    "maintenance",
    "icon.svg",
    "apple-icon.png",
    "favicon.ico",
  ]);

  if (isLocalhost && pathname !== "/") {
    const firstSegment = pathname.slice(1).split("/")[0];
    if (
      !RESERVED_PATHS.has(firstSegment) &&
      !firstSegment.startsWith("_") &&
      !firstSegment.includes(".") &&
      /^[a-z0-9-]{3,32}$/.test(firstSegment)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/store${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Public storefront paths on the main domain (cleandatapacks.com/store/...)
  if (pathname === "/store" || pathname.startsWith("/store/")) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(SESSION_COOKIE)?.value ||
    request.cookies.get("crazytech_session")?.value ||
    request.cookies.get("commontech_session")?.value ||
    request.cookies.get("mycedinet_session")?.value ||
    request.cookies.get("tskconnect_session")?.value;

  let payload: { role?: unknown; tv?: unknown } | null = null;
  if (token) {
    try {
      const { payload: verified } = await jwtVerify(token, secret, {
        issuer: ["cleandatapacks", "crazytech", "commontech", "mycedinet", "tskconnect"],
      });
      payload = verified as { role?: unknown; tv?: unknown };
    } catch {
      payload = null;
    }
  }

  const clearAuthCookies = (res: NextResponse) => {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete("crazytech_session");
    res.cookies.delete("commontech_session");
    res.cookies.delete("mycedinet_session");
    res.cookies.delete("tskconnect_session");
  };

  const role = typeof payload?.role === "string" ? payload.role : null;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isLegalPage =
    pathname === "/terms" ||
    pathname === "/terms-of-service" ||
    pathname === "/privacy" ||
    pathname === "/privacy-policy" ||
    pathname === "/refund-policy" ||
    pathname === "/refunds" ||
    pathname === "/cancellation-policy";

  const isSessionReset =
    request.nextUrl.searchParams.has("session_expired") ||
    request.nextUrl.searchParams.has("logout") ||
    request.nextUrl.searchParams.has("error");

  if (isAuthPage) {
    if (isSessionReset || (token && !payload)) {
      const res = NextResponse.next();
      clearAuthCookies(res);
      return res;
    }

    if (role) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Root URL redirection: authenticated users go to /dashboard, guests go to /login
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (token && !payload) {
      url.pathname = "/login";
      url.search = "";
      const res = NextResponse.redirect(url);
      clearAuthCookies(res);
      return res;
    }
    url.pathname = role ? "/dashboard" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    if (isAuthPage || isLegalPage) return NextResponse.next();
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url);
      if (token) clearAuthCookies(res);
      return res;
    }
    if (role !== "ADMIN" && role !== "MANAGER") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (role === "MANAGER") {
      const isAdminOnly = ADMIN_ONLY_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );
      if (isAdminOnly) {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/orders";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  // Protect dashboard pages
  if (pathname.startsWith("/dashboard")) {
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url);
      if (token) clearAuthCookies(res);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icon.svg|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
