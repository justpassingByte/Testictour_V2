"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DisplayCurrency = "VND" | "USD";

const CURRENCY_STORAGE_KEY = "testictour.displayCurrency";

type CurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (nextCurrency: DisplayCurrency) => void;
  usdToVndRate: number;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("VND");
  const [usdToVndRate, setUsdToVndRate] = useState<number>(25400);

  //   }
  // }, []);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.VND) {
          setUsdToVndRate(data.rates.VND);
        }
      })
      .catch(() => {
        // Keep fallback rate when the API is unavailable.
      });
  }, []);

  const setCurrency = (nextCurrency: DisplayCurrency) => {
    setCurrencyState(nextCurrency);
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
  };

  const value = useMemo(
    () => ({ currency, setCurrency, usdToVndRate }),
    [currency, usdToVndRate]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}

export function getStoredDisplayCurrency(): DisplayCurrency {
  if (typeof window === "undefined") {
    return "VND";
  }

  const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (storedCurrency === "USD" || storedCurrency === "VND") {
    return storedCurrency;
  }
  return "VND";
}
