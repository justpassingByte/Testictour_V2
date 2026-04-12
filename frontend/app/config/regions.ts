/**
 * Canonical global region definitions used throughout the platform.
 * Major Regions map to Riot's routing clusters.
 */
export interface SubRegion {
  id: string;
  name: string;
  flag: string;
}

export interface MajorRegion {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  subRegions: SubRegion[];
}

export const GLOBAL_REGIONS: MajorRegion[] = [
  {
    id: "AMER",
    name: "Americas",
    shortName: "AMER",
    icon: "🌎",
    color: "#22d3ee",
    gradientFrom: "#0891b2",
    gradientTo: "#06b6d4",
    subRegions: [
      { id: "NA1", name: "North America", flag: "🇺🇸" },
      { id: "BR1", name: "Brazil", flag: "🇧🇷" },
      { id: "LA1", name: "Latin America North", flag: "🌎" },
      { id: "LA2", name: "Latin America South", flag: "🌎" },
      { id: "OC1", name: "Oceania", flag: "🇦🇺" },
    ],
  },
  {
    id: "EMEA",
    name: "Europe, Middle East & Africa",
    shortName: "EMEA",
    icon: "🌍",
    color: "#a78bfa",
    gradientFrom: "#7c3aed",
    gradientTo: "#8b5cf6",
    subRegions: [
      { id: "EUW1", name: "Europe West", flag: "🇪🇺" },
      { id: "EUN1", name: "Europe Nordic & East", flag: "🌍" },
      { id: "TR1", name: "Turkey", flag: "🇹🇷" },
      { id: "RU", name: "Russia", flag: "🇷🇺" },
    ],
  },
  {
    id: "APAC",
    name: "Asia Pacific",
    shortName: "APAC",
    icon: "🌏",
    color: "#f472b6",
    gradientFrom: "#db2777",
    gradientTo: "#ec4899",
    subRegions: [
      { id: "KR", name: "Korea", flag: "🇰🇷" },
      { id: "JP1", name: "Japan", flag: "🇯🇵" },
      { id: "VN2", name: "Vietnam", flag: "🇻🇳" },
      { id: "TW2", name: "Taiwan", flag: "🇹🇼" },
      { id: "TH2", name: "Thailand", flag: "🇹🇭" },
      { id: "PH2", name: "Philippines", flag: "🇵🇭" },
      { id: "SG2", name: "Singapore & Malaysia", flag: "🇸🇬" },
      { id: "SEA", name: "Southeast Asia", flag: "🌏" },
    ],
  },
];

/** Map a sub-region ID to its parent major region ID */
export function getMajorRegionId(subRegionId: string): string {
  const upper = subRegionId.toUpperCase();
  for (const region of GLOBAL_REGIONS) {
    if (region.subRegions.some((sr) => sr.id.toUpperCase() === upper)) {
      return region.id;
    }
  }
  return "APAC"; // default
}

/** Get a MajorRegion object by its ID */
export function getMajorRegion(id: string): MajorRegion | undefined {
  return GLOBAL_REGIONS.find((r) => r.id === id);
}

/** Flat list of all sub-regions */
export const ALL_SUB_REGIONS: SubRegion[] = GLOBAL_REGIONS.flatMap(
  (r) => r.subRegions
);
