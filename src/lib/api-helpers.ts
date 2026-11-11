import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./auth";
import { Prisma } from "@prisma/client";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function zodFail(err: ZodError) {
  return NextResponse.json(
    { error: (err as any).issues?.[0]?.message ?? (err as any).errors?.[0]?.message ?? "Invalid input" },
    { status: 400 }
  );
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) return zodFail(err);
  if (err instanceof AuthError) return apiError(err.status, err.message);

  if (err instanceof Prisma.PrismaClientKnownRequestError || (typeof err === "object" && err !== null && "code" in err)) {
    const code = (err as any).code;
    if (code === "P2002") {
      const target = (err as any).meta?.target;
      const targetStr = Array.isArray(target) ? target.join(", ") : String(target || "");
      if (targetStr.includes("network") && targetStr.includes("gbAmount")) {
        return apiError(
          409,
          "A package with this network and data size already exists. Please choose a different data size or edit the existing package."
        );
      }
      return apiError(409, `A record with these unique details already exists (${targetStr || "duplicate"}).`);
    }
    if (code === "P2025") {
      return apiError(404, "The requested record was not found.");
    }
  }

  const message = err instanceof Error ? err.message : "Something went wrong";
  console.error("[api]", err);
  return apiError(500, message);
}

/**
 * Dynamically resolves the full origin (protocol + host) of the incoming request,
 * taking into account reverse proxy headers (x-forwarded-host, x-forwarded-proto, host)
 * and environment variable overrides before falling back to nextUrl.origin.
 */
export function getRequestOrigin(
  request: Request | { headers: Headers; nextUrl?: { origin: string } }
): string {
  const headers = request.headers;
  const rawForwardedHost = headers.get("x-forwarded-host");
  const forwardedHost = rawForwardedHost ? rawForwardedHost.split(",")[0].trim() : null;
  const rawHost = headers.get("host");
  const host = forwardedHost || (rawHost ? rawHost.split(",")[0].trim() : null);
  const rawForwardedProto = headers.get("x-forwarded-proto");
  const proto = rawForwardedProto
    ? rawForwardedProto.split(",")[0].trim()
    : process.env.NODE_ENV === "production"
    ? "https"
    : "http";
  const isLocalhost = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  if (host && !isLocalhost) {
    return `${proto}://${host}`;
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (host) {
    return `${proto}://${host}`;
  }
  if ("nextUrl" in request && request.nextUrl?.origin) {
    return request.nextUrl.origin;
  }
  return "";
}

