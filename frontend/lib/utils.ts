import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency?: "USD" | "VND") => {
  // Mặc định luôn là VND
  let resolvedCurrency: "USD" | "VND" = currency ?? "VND";
  if (!currency && typeof window !== "undefined") {
    const storedCurrency = window.localStorage.getItem("testictour.displayCurrency");
    if (storedCurrency === "USD" || storedCurrency === "VND") {
      resolvedCurrency = storedCurrency;
    }
  }
  const locale = resolvedCurrency === "VND" ? "vi-VN" : "en-US";
  const fractionDigits = resolvedCurrency === "VND" ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
};

export const getTournamentStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (!status) return 'outline';
  switch (status.toUpperCase()) {
    case 'IN_PROGRESS':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'UPCOMING':
      return 'secondary';
    case 'REGISTRATION':
        return 'default';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
};

