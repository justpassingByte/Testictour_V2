"use client"

import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"
import { GLOBAL_REGIONS } from "@/app/config/regions"
import { cn } from "@/lib/utils"
import * as Popover from "@radix-ui/react-popover"

interface RegionSelectorProps {
  value: string
  onChange: (regionId: string) => void
  className?: string
  label?: string
  /** If true, lets user pick a sub-region. Default: major region only. */
  allowSubRegion?: boolean
}

/**
 * Premium Major Region selector using Radix Popover.
 * Fixes clipping in Modals and handles proper focus-trap bypass.
 */
export function RegionSelector({
  value,
  onChange,
  className,
  label,
  allowSubRegion = false,
}: RegionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [hoveredMajor, setHoveredMajor] = useState<string | null>(null)

  function getDisplay() {
    for (const r of GLOBAL_REGIONS) {
      if (r.id === value) return { icon: r.icon, color: r.color, label: `${r.shortName} — ${r.name}` }
      if (allowSubRegion) {
        const sub = r.subRegions.find((s) => s.id === value)
        if (sub) return { icon: sub.flag, color: r.color, label: `${sub.id} — ${sub.name}` }
      }
    }
    return { icon: "🌐", color: "#6b7280", label: "Select Region" }
  }

  const display = getDisplay()

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      )}

      <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition-all duration-150 outline-none cursor-pointer text-white",
              open ? "border-zinc-500" : "border-zinc-700 hover:border-zinc-500"
            )}
            style={{ background: open ? "rgb(39, 39, 42)" : "rgb(24, 24, 27)" }}
          >
            <span className="text-base leading-none shrink-0">{display.icon}</span>
            <span className="flex-1 text-left font-medium text-zinc-100 truncate">{display.label}</span>
            <ChevronDown
              className={cn("w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200", open && "rotate-180")}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            className="z-[9999] rounded-xl border border-zinc-700 overflow-hidden w-[var(--radix-popover-trigger-width)]"
            style={{ 
              boxShadow: "0 8px 48px rgba(0,0,0,0.85), 0 2px 12px rgba(0,0,0,0.5)",
              background: "rgb(9, 9, 11)"
            }}
          >
            <div className="relative z-10 py-1">
              {GLOBAL_REGIONS.map((region) => {
                const isMajorSelected = value === region.id
                const isSubSelected = allowSubRegion && region.subRegions.some((s) => s.id === value)
                const isActive = isMajorSelected || isSubSelected
                const isHovered = hoveredMajor === region.id

                return (
                  <div
                    key={region.id}
                    onMouseEnter={() => setHoveredMajor(region.id)}
                    onMouseLeave={() => setHoveredMajor(null)}
                  >
                    {/* Major region row */}
                    <button
                      type="button"
                      onClick={() => { onChange(region.id); setOpen(false) }}
                      className="relative w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer outline-none transition-colors duration-100 text-left"
                      style={{
                        background: isActive || isHovered ? "rgba(255,255,255,0.05)" : "transparent",
                      }}
                    >
                      <span
                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full transition-opacity duration-150"
                        style={{ background: region.color, opacity: isActive || isHovered ? 1 : 0 }}
                      />
                      <span className="text-lg leading-none ml-1">{region.icon}</span>
                      <span className="flex-1">
                        <span
                          className="font-bold tracking-wide text-xs uppercase"
                          style={{ color: isActive || isHovered ? region.color : "#9ca3af" }}
                        >
                          {region.shortName}
                        </span>
                        <span className="ml-2 text-zinc-400 text-xs">{region.name}</span>
                      </span>
                      {isMajorSelected && !allowSubRegion && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: region.color }} />
                      )}
                    </button>

                    {/* Sub-region bubbles */}
                    {!allowSubRegion && isHovered && (
                      <div className="flex flex-wrap gap-1 px-4 pb-2 pl-11">
                        {region.subRegions.map((sub) => (
                          <span
                            key={sub.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                            style={{ background: `${region.color}18`, borderColor: `${region.color}35`, color: region.color }}
                          >
                            {sub.flag} {sub.id}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sub-region rows */}
                    {allowSubRegion && (isHovered || isSubSelected) && (
                      <div className="px-2 pb-1.5">
                        {region.subRegions.map((sub) => {
                          const isSubActive = value === sub.id
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => { onChange(sub.id); setOpen(false) }}
                              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer outline-none text-left transition-colors duration-100"
                              style={
                                isSubActive
                                  ? { background: `${region.color}25`, color: region.color }
                                  : { color: "rgb(161,161,170)" }
                              }
                              onMouseEnter={(e) => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)" }}
                              onMouseLeave={(e) => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = "" }}
                            >
                              <span className="text-sm">{sub.flag}</span>
                              <span className="font-semibold w-10 shrink-0">{sub.id}</span>
                              <span className="opacity-75 truncate">{sub.name}</span>
                              {isSubActive && <Check className="w-3 h-3 ml-auto shrink-0" style={{ color: region.color }} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
