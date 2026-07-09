/**
 * Shared helpers for CodeCraft Network API routing.
 * Used by provider fulfillment and the CodeCraft status worker.
 */

const BIG_TIME_PATTERNS = [
  'bigtime',
  'big time',
  'big-time',
  'big_time',
  'big.time',
];

/**
 * Detect whether a product should use CodeCraft BigTime (`/special.php`)
 * instead of the regular package endpoint (`/initiate.php`).
 *
 * Matches on name, description and slug so admin product naming variants work,
 * e.g. "Airteltigo Bigtime", "AT Big Time 50GB", slug "airteltigo-bigtime-50".
 */
export const isBigTimeProduct = (...parts: Array<string | null | undefined>): boolean => {
  const haystack = parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .toLowerCase()
    .replace(/[_./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!haystack) return false;

  return BIG_TIME_PATTERNS.some((pattern) => haystack.includes(pattern));
};

/**
 * Normalize internal network codes to CodeCraft network strings.
 * Accepts common aliases so a mis-seeded / renamed network still routes.
 */
export const toCodecraftNetwork = (
  networkCode: string,
): 'MTN' | 'AT' | 'TELECEL' | null => {
  const code = (networkCode || '').toUpperCase().replace(/[\s_-]+/g, '');

  if (code === 'MTN') return 'MTN';
  if (code === 'TELECEL' || code === 'VODAFONE') return 'TELECEL';
  if (
    code === 'AIRTELTIGO' ||
    code === 'AIRTELTIGOGHANA' ||
    code === 'AT' ||
    code === 'AIRTEL' ||
    code === 'TIGO' ||
    code === 'ATLIGO' ||
    code === 'AIRTELTIGOAT'
  ) {
    return 'AT';
  }

  return null;
};

/**
 * True when this network is fulfilled via CodeCraft (Telecel + AirtelTigo/AT).
 */
export const isCodecraftNetwork = (networkCode: string): boolean => {
  const mapped = toCodecraftNetwork(networkCode);
  return mapped === 'AT' || mapped === 'TELECEL';
};

/**
 * Derive the CodeCraft `gig` package value from product fields.
 * CodeCraft expects bare numbers: "1", "2", "50" (not "1GB").
 *
 * Preference order:
 * 1. Explicit dataSize (e.g. "50GB", "500MB")
 * 2. Description / name digits (e.g. "50GB BigTime")
 * 3. Fallback to raw dataSize string
 */
export const toCodecraftGig = (opts: {
  dataSize?: string | null;
  description?: string | null;
  name?: string | null;
}): string => {
  const candidates = [opts.dataSize, opts.description, opts.name].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  for (const candidate of candidates) {
    const cleaned = candidate.trim().toUpperCase().replace(/\s+/g, '');
    // Prefer explicit GB/MB sizes first
    const gbMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*GB/i) || candidate.match(/(\d+(?:\.\d+)?)\s*GB/i);
    if (gbMatch) {
      const n = parseFloat(gbMatch[1]);
      if (Number.isFinite(n) && n > 0) {
        // CodeCraft packages use whole numbers (1, 2, 50…). Keep decimals only if needed.
        return Number.isInteger(n) ? String(n) : String(n);
      }
    }

    const mbMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*MB/i) || candidate.match(/(\d+(?:\.\d+)?)\s*MB/i);
    if (mbMatch) {
      const n = parseFloat(mbMatch[1]);
      if (Number.isFinite(n) && n > 0) {
        return Number.isInteger(n) ? String(n) : String(n);
      }
    }

    // Bare number (e.g. description "50" for BigTime)
    const bare = cleaned.match(/^(\d+(?:\.\d+)?)$/);
    if (bare) {
      return bare[1].replace(/\.0+$/, '');
    }
  }

  // Last resort: strip non-digits from dataSize
  if (opts.dataSize) {
    const digits = opts.dataSize.replace(/[^\d.]/g, '');
    if (digits) return digits.replace(/\.0+$/, '');
  }

  for (const candidate of candidates) {
    const digits = candidate.replace(/[^\d.]/g, '');
    if (digits) return digits.replace(/\.0+$/, '');
  }

  return '';
};

/**
 * Normalize Ghana MSISDN to local 0XXXXXXXXX form used by CodeCraft examples.
 * Accepts 233..., +233..., 0..., or bare 9-digit local numbers.
 */
export const toCodecraftRecipient = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return phone;

  // 233XXXXXXXXX → 0XXXXXXXXX
  if (digits.startsWith('233') && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }

  // Already local with leading 0
  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(0, 10);
  }

  // Bare 9-digit (e.g. 554226398) → 0554226398
  if (digits.length === 9) {
    return `0${digits}`;
  }

  // 10 digits without leading 0 is unusual; return as-is
  return digits;
};
