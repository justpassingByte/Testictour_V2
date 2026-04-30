"use client"

import { useCurrency } from "@/app/contexts/currency-context"
import { formatCurrency } from "@/lib/utils"

/**
 * Backward-compatible hook that delegates to the canonical CurrencyProvider.
 * All components should eventually migrate to useCurrency() directly.
 */
export function useCurrencyRate() {
  const { currency, usdToVndRate } = useCurrency()

  const formatVndText = (usdAmount: number) => {
    const displayAmount = currency === "VND" ? usdAmount * usdToVndRate : usdAmount
    return `≈ ${formatCurrency(displayAmount, currency)}`
  }

  return { usdToVndRate, formatVndText }
}
