"use client"

import { useState } from "react"
import { GLOBAL_REGIONS, MajorRegion } from "@/app/config/regions"
import { cn } from "@/lib/utils"

interface RegionSelectorProps {
  value: string
  onChange: (regionId: string) => void
  className?: string
  label?: string
}

/**
 * A premium Major Region selector that shows sub-regions on hover.
 * Used in CreateTournamentPage and TournamentRegistration.
 */
export function RegionSelector({ value, onChange, className, label }: RegionSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-3">
        {GLOBAL_REGIONS.map((region) => {
          const isSelected = value === region.id
          const isHovered = hoveredId === region.id
          return (
            <div
              key={region.id}
              className="relative"
              onMouseEnter={() => setHoveredId(region.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Main Clickable Card */}
              <button
                type="button"
                onClick={() => onChange(region.id)}
                className={cn(
                  "w-full relative group flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-4 text-center transition-all duration-300 cursor-pointer outline-none",
                  isSelected
                    ? "border-transparent shadow-lg scale-[1.02]"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:scale-[1.01]"
                )}
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${region.gradientFrom}30, ${region.gradientTo}20)`,
                        borderColor: `${region.color}60`,
                        boxShadow: `0 0 20px ${region.color}30`,
                      }
                    : isHovered
                    ? {
                        borderColor: `${region.color}40`,
                        background: `${region.color}08`,
                      }
                    : {}
                }
                aria-pressed={isSelected}
              >
                {/* Selection ring */}
                {isSelected && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      boxShadow: `inset 0 0 0 1.5px ${region.color}80`,
                    }}
                  />
                )}

                <span className="text-2xl leading-none select-none">{region.icon}</span>
                <span
                  className={cn(
                    "text-xs font-bold tracking-widest uppercase transition-colors",
                    isSelected ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                  )}
                  style={isSelected ? { color: region.color } : {}}
                >
                  {region.shortName}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight transition-colors",
                    isSelected ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-400"
                  )}
                >
                  {region.subRegions.length} servers
                </span>

                {/* Selection dot */}
                {isSelected && (
                  <div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full"
                    style={{ background: region.color }}
                  />
                )}
              </button>

              {/* Hover tooltip showing sub-regions */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 z-50 min-w-[180px] max-w-[220px] transition-all duration-200 pointer-events-none",
                  "bottom-[calc(100%+8px)]",
                  isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                )}
              >
                <div
                  className="rounded-xl border p-3 shadow-2xl backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(135deg, #0f0f14ee, #17171fee)`,
                    borderColor: `${region.color}40`,
                    boxShadow: `0 10px 40px rgba(0,0,0,0.8), 0 0 30px ${region.color}15`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                    <span className="text-base">{region.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: region.color }}>
                      {region.name}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {region.subRegions.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <span className="text-xs">{sub.flag}</span>
                        <span className="text-[11px] text-zinc-300 font-medium">{sub.id}</span>
                        <span className="text-[10px] text-zinc-500 truncate">{sub.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5">
                  <div
                    className="w-3 h-1.5 overflow-hidden"
                    style={{ filter: `drop-shadow(0 2px 4px ${region.color}40)` }}
                  >
                    <div
                      className="w-3 h-3 rotate-45 -translate-y-1.5 mx-auto border-r border-b"
                      style={{
                        background: "#17171f",
                        borderColor: `${region.color}40`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected region info bar */}
      {value && (() => {
        const region = GLOBAL_REGIONS.find((r) => r.id === value)
        if (!region) return null
        return (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: `${region.color}10`,
              borderLeft: `2px solid ${region.color}60`,
            }}
          >
            <span>{region.icon}</span>
            <span className="font-medium" style={{ color: region.color }}>
              {region.shortName}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="text-zinc-400">
              Includes: {region.subRegions.map((s) => s.id).join(", ")}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
