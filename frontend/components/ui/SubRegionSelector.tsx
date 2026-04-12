"use client"

import { GLOBAL_REGIONS } from "@/app/config/regions"
import { cn } from "@/lib/utils"

interface SubRegionSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
  /** If true renders as a native <select> for form compat */
  native?: boolean
}

/**
 * A sub-region selector grouped by major region.
 * Renders as a styled <select> with <optgroup> elements.
 */
export function SubRegionSelector({ value, onChange, className, id, native = true }: SubRegionSelectorProps) {
  if (native) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full rounded-md border border-zinc-800 bg-black/40 px-3 py-1 text-sm text-white",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500",
          "appearance-none cursor-pointer",
          className
        )}
      >
        {GLOBAL_REGIONS.map((region) => (
          <optgroup
            key={region.id}
            label={`${region.icon} ${region.name} (${region.shortName})`}
            style={{ fontWeight: "bold", color: "#9ca3af" }}
          >
            {region.subRegions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.flag} {sub.id} — {sub.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  // Custom styled dropdown (non-native)
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm text-white",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500",
        className
      )}
    >
      {GLOBAL_REGIONS.map((region) => (
        <optgroup key={region.id} label={`── ${region.name} (${region.shortName}) ──`}>
          {region.subRegions.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.flag} {sub.id} – {sub.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
