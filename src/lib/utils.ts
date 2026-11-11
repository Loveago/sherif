import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function orderCode(id: number): string {
  return `CT-${10000 + id}`;
}

export function parseOrderCode(code: string | null | undefined): number | null {
  if (!code || typeof code !== "string") return null;
  const trimmed = code.trim();
  const match = /^(?:CT|CDI|CF|TSK|MCD)?(?:-?ORD)?-(\d+)$/i.exec(trimmed);
  if (match) {
    const rawNum = parseInt(match[1], 10);
    if (rawNum > 10000) {
      return rawNum - 10000;
    }
    return rawNum > 0 ? rawNum : null;
  }
  const asInt = parseInt(trimmed, 10);
  if (Number.isFinite(asInt) && String(asInt) === trimmed) {
    if (asInt > 10000) return asInt - 10000;
    return asInt > 0 ? asInt : null;
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
