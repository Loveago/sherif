/**
 * Client-safe storefront money and formatting utilities.
 * Free of server-only imports (like next/headers, prisma, auth).
 */

export function toPesewas(ghs: number): number {
  return Math.round(ghs * 100);
}

export function fromPesewas(pesewas: number): number {
  return Math.round(pesewas) / 100;
}

export function formatGhs(pesewas: number): string {
  return `GHS ${fromPesewas(pesewas).toFixed(2)}`;
}

export function storefrontOrderCode(seq: number, reference?: string | null): string {
  if (
    reference &&
    (reference.startsWith("CT-") ||
      reference.startsWith("GH-") ||
      reference.startsWith("STF-") ||
      reference.startsWith("CDI-") ||
      reference.startsWith("CF-") ||
      reference.startsWith("TSK-"))
  ) {
    return reference;
  }
  return `CT-ST-${String(seq).padStart(5, "0")}`;
}

export function withdrawalCode(seq: number): string {
  return `CT-WD-${String(seq).padStart(5, "0")}`;
}

/**
 * Safely sanitizes a domain or host string by stripping any protocol (http://, https://, https//),
 * paths, trailing/leading slashes, and leading 'www.'
 *
 * Handles user configuration inputs such as:
 * - "https://cedistore.vercel.app" -> "cedistore.vercel.app"
 * - "https://https//cedistore.vercel.app/ctech" -> "cedistore.vercel.app"
 * - "http://localhost:3000" -> "localhost:3000"
 * - "cedistore.vercel.app/" -> "cedistore.vercel.app"
 */
export function cleanDomain(domain?: string | null, fallback: string = "localhost:3000"): string {
  if (!domain || typeof domain !== "string") return fallback;
  const trimmed = domain.trim().toLowerCase();
  if (!trimmed) return fallback;

  // Repeatedly strip protocols or protocol typos like https://, http://, https//, http//, //
  let cleaned = trimmed.replace(/^(?:https?:?\/?\/?)+/i, "");
  // Strip any trailing path or query
  cleaned = cleaned.split("/")[0].trim();
  // Strip leading www.
  cleaned = cleaned.replace(/^www\./, "");

  return cleaned || fallback;
}

/**
 * Builds a clean, safe storefront full URL on the main domain (https://cleandatapacks.com/store/:slug).
 * Automatically adapts between local development (http://localhost:3000/store/:slug)
 * and production deployment (https://cleandatapacks.com/store/:slug).
 */
export function buildStorefrontUrl(slug?: string | null, domain?: string | null, subpath: string = ""): string {
  let effectiveDomain = domain;

  // If in browser, prefer the current browser host so links stay on the active domain
  if (typeof window !== "undefined") {
    effectiveDomain = window.location.host;
  } else if (!effectiveDomain) {
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.MAIN_DOMAIN?.includes("localhost") ||
      process.env.NEXT_PUBLIC_MAIN_DOMAIN?.includes("localhost")
    ) {
      effectiveDomain =
        process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
        process.env.MAIN_DOMAIN ||
        "localhost:3000";
    } else {
      effectiveDomain =
        process.env.NEXT_PUBLIC_MAIN_DOMAIN ||
        process.env.MAIN_DOMAIN ||
        "cleandatapacks.com";
    }
  }

  const host = cleanDomain(effectiveDomain, "cleandatapacks.com");
  const cleanSub = subpath ? (subpath.startsWith("/") ? subpath : `/${subpath}`) : "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = isLocal ? "http" : "https";

  const slugPart = slug ? `/store/${slug.replace(/^\/+/, "")}` : "/store";
  return `${protocol}://${host}${slugPart}${cleanSub}`;
}

/**
 * Normalizes any phone number string into an international WhatsApp-compatible number format (Ghana +233 standard).
 * Handles formats:
 * - "0241234567" -> "233241234567"
 * - "241234567" -> "233241234567"
 * - "+233 24 123 4567" -> "233241234567"
 * - "00233241234567" -> "233241234567"
 * - "+2330241234567" -> "233241234567"
 */
export function normalizeWhatsAppNumber(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // Strip international dialing prefixes
  if (digits.startsWith("00233")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("2330")) {
    // Mistyped +233(0)24...
    digits = `233${digits.slice(4)}`;
  } else if (digits.startsWith("0")) {
    // Standard local Ghana 10-digit number e.g. 024...
    digits = `233${digits.slice(1)}`;
  } else if (!digits.startsWith("233") && digits.length === 9) {
    // 9 digits without leading 0 e.g. 241234567
    digits = `233${digits}`;
  }

  return digits;
}

/**
 * Builds a direct wa.me link with optional pre-filled message text.
 */
export function buildWhatsAppLink(phone?: string | null, text?: string): string | null {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;
  return text ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}` : `https://wa.me/${normalized}`;
}

