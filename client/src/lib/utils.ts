import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function parseCurrencyString(value: string): number {
  if (!value) return 0;
  // Strip currency symbols, commas, whitespace
  let clean = value.replace(/[,$\s]/g, "");
  // Strip trailing time-period suffixes: /yr, /year, /mo, /month, per year, annually, etc.
  clean = clean.replace(/\/(yr|year|mo|month|quarter|qtr|week|day|annual)$/i, "");
  clean = clean.replace(/per\s*(year|month|quarter|week|day|annum)$/i, "");
  clean = clean.replace(/(annually|monthly|yearly)$/i, "");
  // Check for M/K/B multiplier suffixes
  if (/m$/i.test(clean)) return parseFloat(clean) * 1_000_000;
  if (/k$/i.test(clean)) return parseFloat(clean) * 1_000;
  if (/b$/i.test(clean)) return parseFloat(clean) * 1_000_000_000;
  return parseFloat(clean) || 0;
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
