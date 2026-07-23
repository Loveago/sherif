/**
 * Shared Ghana phone / MSISDN helpers for provider status matching.
 * Providers often return slightly different formats (0XXXXXXXXX, 233XXXXXXXXX, +233...).
 */

/** Digits only. */
export const digitsOnly = (value: string | null | undefined): string =>
  (value || '').replace(/\D/g, '');

/**
 * Last 9 national digits (Ghana mobile without leading 0 / country code).
 * e.g. 0554226398, 233554226398, 554226398 → 554226398
 */
export const ghanaNational9 = (value: string | null | undefined): string | null => {
  const digits = digitsOnly(value);
  if (!digits) return null;

  if (digits.startsWith('233') && digits.length >= 12) {
    return digits.slice(3, 12);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return digits.slice(1, 10);
  }
  if (digits.length === 9) {
    return digits;
  }
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return null;
};

/** True when two phone-like values refer to the same Ghana number. */
export const phonesMatch = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => {
  const left = ghanaNational9(a);
  const right = ghanaNational9(b);
  if (left && right) return left === right;

  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
};
