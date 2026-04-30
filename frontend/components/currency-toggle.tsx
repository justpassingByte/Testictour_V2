"use client";

import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DisplayCurrency, useCurrency } from "@/app/contexts/currency-context";

const CURRENCIES: DisplayCurrency[] = ["VND", "USD"];

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="focus-visible:ring-0" aria-label="Switch currency">
                <Coins className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Switch currency</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CURRENCIES.map((code) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => setCurrency(code)}
                  className={currency === code ? "bg-muted" : ""}
                >
                  {code} {currency === code ? "✓" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Display currency ({currency})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
