"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GLOBAL_REGIONS } from "@/app/config/regions"
import { cn } from "@/lib/utils"

interface SubRegionSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
  label?: string
}

export function SubRegionSelector({
  value,
  onChange,
  className,
  id,
  label,
}: SubRegionSelectorProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger 
          id={id} 
          className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 h-[42px] focus:ring-zinc-600 focus:ring-offset-0 focus:border-zinc-500"
        >
          <SelectValue placeholder="Select a region" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] border-zinc-700 bg-zinc-950 text-zinc-100 z-[99999]">
          {GLOBAL_REGIONS.map((region) => {
            if (region.subRegions.length === 0) return null;
            return (
              <SelectGroup key={region.id} className="pt-1">
                <SelectLabel className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider py-1.5 opacity-80" style={{ color: region.color }}>
                  <span>{region.icon}</span> {region.shortName}
                </SelectLabel>
                {region.subRegions.map((sub) => (
                  <SelectItem 
                    key={sub.id} 
                    value={sub.id}
                    className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer pl-6 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{sub.flag}</span>
                      <span className="font-semibold text-xs min-w-[3rem] opacity-90">{sub.id}</span>
                      <span className="text-xs opacity-70">{sub.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
