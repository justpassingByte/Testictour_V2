"use client"

import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export interface PlayerIdentityFields {
  username?: string
  discordId?: string
  riotGameName?: string
  riotGameTag?: string
  name?: string
}

export function formatInGameTag(name?: string, tag?: string): string {
  if (name && tag) return `${name}#${tag}`
  return name || tag || ""
}

export function getPlayerInGameTag(player: PlayerIdentityFields): string {
  return formatInGameTag(player.riotGameName, player.riotGameTag) || player.name || player.username || "—"
}

export function getPlayerRealName(player: PlayerIdentityFields): string {
  return player.username || "—"
}

function CopyDiscordButton({ discordId }: { discordId: string }) {
  const t = useTranslations("common")
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(discordId)
    setCopied(true)
    toast.success(t("copied_discord_id"))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[#5865F2] hover:text-[#7289DA] transition-colors"
      title={t("discord_id")}
    >
      <span className="font-mono truncate max-w-[100px]">{discordId}</span>
      {copied ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0 opacity-60" />}
    </button>
  )
}

export function PlayerIdentityLines({
  player,
  showLabels = false,
  compact = false,
}: {
  player: PlayerIdentityFields
  showLabels?: boolean
  compact?: boolean
}) {
  const t = useTranslations("common")
  const inGameTag = getPlayerInGameTag(player)
  const realName = getPlayerRealName(player)
  const discordId = player.discordId?.trim()

  if (showLabels) {
    return (
      <div className={`grid gap-0.5 ${compact ? "text-[10px]" : "text-xs"}`}>
        <div className="font-semibold truncate leading-tight">{inGameTag}</div>
        <div className="text-muted-foreground truncate leading-tight">
          <span className="opacity-70">{t("real_name")}:</span> {realName}
        </div>
        <div className="truncate leading-tight">
          <span className="text-muted-foreground opacity-70">{t("discord_id")}:</span>{" "}
          {discordId ? <CopyDiscordButton discordId={discordId} /> : <span className="text-muted-foreground">—</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 min-w-0 ${compact ? "space-y-0" : "space-y-0.5"}`}>
      <div className={`${compact ? "text-[11px]" : "text-xs"} font-semibold truncate leading-tight`}>{inGameTag}</div>
      <div className={`${compact ? "text-[9px]" : "text-[10px]"} text-muted-foreground truncate leading-tight`}>
        {realName !== "—" && <span>{realName}</span>}
        {realName !== "—" && discordId && <span className="mx-1 opacity-40">•</span>}
        {discordId ? <CopyDiscordButton discordId={discordId} /> : realName === "—" ? "—" : null}
      </div>
    </div>
  )
}
