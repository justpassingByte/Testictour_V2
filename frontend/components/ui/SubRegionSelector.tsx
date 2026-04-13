"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GLOBAL_REGIONS, getMajorRegionId, getMajorRegion } from "@/app/config/regions"
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
  // Sync initial major region based on the incoming sub-region value
  const initialMajorRegion = getMajorRegionId(value || "VN2")
  const [majorRegion, setMajorRegion] = useState(initialMajorRegion)
  
  useEffect(() => {
    const parent = getMajorRegionId(value)
    if (parent && parent !== majorRegion) {
      setMajorRegion(parent)
    }
  }, [value])

  const handleMajorChange = (newMajor: string) => {
    setMajorRegion(newMajor)
    // Auto-select the first sub-region of the new major region
    const regionObj = getMajorRegion(newMajor)
    if (regionObj && regionObj.subRegions.length > 0) {
      onChange(regionObj.subRegions[0].id)
    }
  }

  const currentMajorRegionObj = getMajorRegion(majorRegion)
  const currentSubRegions = currentMajorRegionObj?.subRegions || []

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      <div className="flex flex-col space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-zinc-300">
            Khu vực lớn (Major Region)
          </label>
        )}
        <Select value={majorRegion} onValueChange={handleMajorChange}>
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 h-[42px] focus:ring-zinc-600">
            <SelectValue placeholder="Chọn khu vực lớn" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-950 text-zinc-100 z-[99999]">
            {GLOBAL_REGIONS.map((region) => (
              <SelectItem key={region.id} value={region.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>{region.icon}</span>
                  <span className="font-semibold" style={{ color: region.color }}>{region.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-zinc-300">
            Máy chủ (Server)
          </label>
        )}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 h-[42px] focus:ring-zinc-600">
            <SelectValue placeholder="Chọn máy chủ" />
          </SelectTrigger>
          <SelectContent className="border-zinc-700 bg-zinc-950 text-zinc-100 z-[99999] max-h-[300px]">
            <SelectGroup>
              {currentSubRegions.map((sub) => (
                <SelectItem key={sub.id} value={sub.id} className="focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{sub.flag}</span>
                    <span className="font-semibold text-xs min-w-[3rem] opacity-90">{sub.id}</span>
                    <span className="text-xs opacity-70">{sub.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
