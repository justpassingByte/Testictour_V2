"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslations } from 'next-intl'

type Status = "live" | "syncing" | "error" | "idle"

interface SyncStatusProps {
  status?: Status
  onSync?: () => Promise<void>
  /** Cooldown seconds between manual syncs. Default: 30 */
  cooldown?: number
}

export function SyncStatus({ status = "idle", onSync, cooldown = 30 }: SyncStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<Status>(status)
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const baseStatus = useRef<Status>(status) // remember original status for reset
  const t = useTranslations('common')

  // Keep baseStatus in sync when prop changes (e.g. parent knows tournament is live)
  useEffect(() => {
    baseStatus.current = status
    // Only update UI status if not currently syncing/cooling
    if (currentStatus !== "syncing" && cooldownLeft === 0) {
      setCurrentStatus(status)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const startCooldown = useCallback(() => {
    setCooldownLeft(cooldown)
    cooldownTimer.current = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!)
          cooldownTimer.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [cooldown])

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    }
  }, [])

  const handleSync = useCallback(async () => {
    if (currentStatus === "syncing" || cooldownLeft > 0) return

    try {
      setCurrentStatus("syncing")
      if (onSync) {
        await onSync()
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      setCurrentStatus(baseStatus.current === "idle" ? "live" : baseStatus.current)
      startCooldown()
    } catch {
      setCurrentStatus("error")
    }
  }, [currentStatus, cooldownLeft, onSync, startCooldown])

  const isCooling = cooldownLeft > 0
  const isDisabled = currentStatus === "syncing" || isCooling

  // If no onSync provided, just show status indicator without the button
  const showButton = !!onSync

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div
              className={`
                h-2 w-2 rounded-full transition-colors duration-500 flex-shrink-0
                ${currentStatus === "live" && "bg-live-update animate-glow"}
                ${currentStatus === "syncing" && "bg-yellow-500 animate-pulse"}
                ${currentStatus === "error" && "bg-destructive"}
                ${currentStatus === "idle" && "bg-muted"}
              `}
            />
            <span className="text-sm text-muted-foreground">
              {currentStatus === "live" && t("live_updates")}
              {currentStatus === "syncing" && t("syncing")}
              {currentStatus === "error" && t("sync_error")}
              {currentStatus === "idle" && t("not_synced")}
            </span>
            {showButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 relative"
                onClick={handleSync}
                disabled={isDisabled}
                aria-label={t("syncing")}
              >
                {currentStatus === "syncing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCooling ? (
                  <span className="text-[10px] font-mono font-bold text-muted-foreground leading-none">
                    {cooldownLeft}s
                  </span>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isCooling
              ? `Next refresh in ${cooldownLeft}s`
              : currentStatus === "live"
                ? t("sync_tooltip.live_updates")
                : currentStatus === "syncing"
                  ? t("sync_tooltip.syncing")
                  : currentStatus === "error"
                    ? t("sync_tooltip.sync_error")
                    : showButton
                      ? "Click to refresh data"
                      : t("sync_tooltip.not_synced")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
