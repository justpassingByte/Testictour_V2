"use client"

import { useState, useEffect } from "react"

export function useCurrencyRate() {
  const [usdToVndRate, setUsdToVndRate] = useState<number>(25400) // Fallback rate

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates?.VND) {
          setUsdToVndRate(data.rates.VND)
        }
      })
      .catch(console.error)
  }, [])

  const formatVndText = (usdAmount: number) => {
    return `≈ ${(usdAmount * usdToVndRate).toLocaleString('vi-VN')} VND`
  }

  return { usdToVndRate, formatVndText }
}
