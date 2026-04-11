'use client';

import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { GrimoireParticipantData, GrimoireMatchData, GrimoireTraitData, GrimoireUnitData, GrimoireAugmentData } from '@/app/types/riot';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PLACEMENT_COLORS: Record<number, string> = {
  1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40',
  2: 'text-slate-300 bg-slate-300/10 border-slate-300/40',
  3: 'text-amber-600 bg-amber-600/10 border-amber-600/30',
};

const COST_BORDER: Record<number, string> = {
  1: 'border-zinc-400',
  2: 'border-green-400',
  3: 'border-blue-400',
  4: 'border-purple-500',
  5: 'border-yellow-400',
};

const TRAIT_STYLE_BORDER = [
  'border-zinc-600',     // 0 inactive
  'border-amber-800',    // 1 bronze
  'border-slate-400',    // 2 silver
  'border-yellow-400',   // 3 gold
  'border-fuchsia-400',  // 4 prismatic
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ tier }: { tier: number }) {
  const color = tier === 3 ? 'text-yellow-400' : tier === 2 ? 'text-yellow-200/70' : 'text-zinc-500';
  return (
    <div className="flex gap-px justify-center">
      {Array.from({ length: Math.min(tier, 3) }).map((_, i) => (
        <span key={i} className={`text-[8px] leading-none ${color}`}>★</span>
      ))}
    </div>
  );
}

function UnitCell({ unit }: { unit: GrimoireUnitData }) {
  const border = COST_BORDER[unit.cost] ?? 'border-zinc-500';
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-[2px]">
            <div className={`relative w-[38px] h-[38px] rounded border-2 ${border} overflow-hidden bg-zinc-800/80 flex-shrink-0`}>
              {unit.iconUrl ? (
                <Image src={unit.iconUrl} alt={unit.name} fill className="object-cover" unoptimized sizes="38px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[7px] text-zinc-400 p-0.5 text-center leading-tight">{unit.name}</div>
              )}
              {/* Items overlaid bottom */}
              {unit.items && unit.items.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-[1px] pb-[1px]">
                  {unit.items.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-[11px] h-[11px] relative bg-zinc-900/90 rounded-[2px] overflow-hidden border border-zinc-600/50">
                      {item.iconUrl && <Image src={item.iconUrl} alt={item.name} fill className="object-cover" unoptimized sizes="11px" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Stars tier={unit.tier} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50 max-w-[180px]">
          <p className="font-semibold text-sm">{unit.name}</p>
          <p className="text-xs text-muted-foreground">{unit.cost}-cost · {unit.tier}★</p>
          {unit.items && unit.items.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {unit.items.map((item, i) => <p key={i} className="text-xs text-slate-300">• {item.name}</p>)}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TraitCell({ trait }: { trait: GrimoireTraitData }) {
  // Muted, simpler TFT Trait hex colors based on style tier
  // 4 = prismatic, 3 = gold, 2 = silver, 1 = bronze, 0 = inactive
  const hexFill = 
    trait.style === 4 ? '#9333ea' : // purple-600
    trait.style === 3 ? '#b48608' : // muted gold
    trait.style === 2 ? '#64748b' : // slate-500
    trait.style === 1 ? '#854d0e' : // dark bronze
    '#27272a'; // zinc-800
  
  const hexStroke = 
    trait.style === 4 ? '#d8b4fe' : 
    trait.style === 3 ? '#fde047' : 
    trait.style === 2 ? '#cbd5e1' : 
    trait.style === 1 ? '#d97706' : 
    '#52525b';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative flex items-center justify-center w-[26px] h-[30px] ${trait.style === 0 ? 'opacity-40 grayscale' : ''}`}>
            {/* Hexagon SVG Background */}
            <svg viewBox="0 0 24 28" className="absolute inset-0 w-full h-full">
              <polygon 
                points="12,1 23,7.5 23,20.5 12,27 1,20.5 1,7.5" 
                fill={hexFill} 
                stroke={hexStroke}
                strokeWidth="1.5"
                opacity={0.9}
              />
            </svg>

            {/* Trait Icon */}
            <div className="relative w-3.5 h-3.5 z-10 flex items-center justify-center text-[8px] font-bold text-white/90">
              {trait.iconUrl
                ? <Image src={trait.iconUrl} alt={trait.displayName} fill className="object-contain brightness-0 invert opacity-90" unoptimized sizes="14px" />
                : <span>{trait.displayName.slice(0, 2)}</span>
              }
            </div>

            {/* Units Badge */}
            {trait.style > 0 && (
              <div className="absolute -bottom-1 -right-1 z-20 flex items-center justify-center min-w-[13px] h-[13px] px-[2px] bg-zinc-900 border border-zinc-700/80 rounded-full text-[8.5px] font-bold tabular-nums text-zinc-300 leading-none">
                {trait.numUnits}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50 border-zinc-800 bg-zinc-950/90 text-zinc-100 backdrop-blur">
          <p className="font-semibold">{trait.displayName}</p>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">{trait.numUnits} / {trait.tierTotal}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AugmentCell({ augment }: { augment: GrimoireAugmentData }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative w-[26px] h-[26px] rounded border border-indigo-400/50 bg-indigo-900/30 overflow-hidden flex-shrink-0">
            {augment.iconUrl
              ? <Image src={augment.iconUrl} alt={augment.name} fill className="object-cover" unoptimized sizes="26px" />
              : <div className="w-full h-full flex items-center justify-center text-[7px] text-indigo-300">{augment.name.slice(0, 2)}</div>
            }
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50">
          <p className="text-sm">{augment.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatTftRound(lastRound: number): string {
  if (!lastRound) return "-";
  // Rough approximation for TFT stage-round (1-1, 1-2, 2-1, etc.)
  // Usually 1 stage = 7 rounds (in older sets) or similar.
  const stage = Math.floor((lastRound - 1) / 7) + 1;
  const round = ((lastRound - 1) % 7) + 1;
  return `Stage ${stage}-${round}`;
}

function formatTime(seconds: number): string {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ParticipantRow({ p, points, prize, highlightPuuid }: {
  p: GrimoireParticipantData;
  points?: number;
  prize?: number;
  highlightPuuid?: string;
}) {
  const placementColor = PLACEMENT_COLORS[p.placement] ?? 'text-muted-foreground bg-muted/20 border-muted/30';
  const isHighlight = highlightPuuid && p.puuid === highlightPuuid;

  // Only show active traits (style > 0), sorted by style desc
  const activeTraits = (p.traits ?? [])
    .filter(t => t.style > 0)
    .sort((a, b) => b.style - a.style || b.numUnits - a.numUnits);

  // Sort units by cost desc
  const sortedUnits = [...(p.units ?? [])].sort((a, b) => b.cost - a.cost || b.tier - a.tier);

  return (
    <div className={`grid gap-3 md:gap-4 p-3 rounded-lg border transition-colors items-center ${
      isHighlight ? 'bg-primary/5 border-primary/30' : 'bg-zinc-900/40 border-zinc-800/60'
    }`}
      style={{ gridTemplateColumns: 'minmax(30px, auto) minmax(100px, 140px) minmax(60px, 80px) 1fr minmax(60px, auto)' }}
    >
      {/* 1. Placement */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-md border text-base font-bold tabular-nums ${placementColor}`}>
        {p.placement}
      </div>

      {/* 2. Player Info & Tournament Points */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="truncate font-semibold text-sm text-zinc-200" title={p.gameName}>
          {p.gameName}
        </div>
        <div className="text-[10px] text-zinc-500 mb-1">
          #{p.tagLine}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeof points === 'number' && points > 0 && (
            <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold w-fit border border-primary/30 shadow-[0_0_8px_rgba(var(--primary),0.2)]">
              +{points} PTS
            </div>
          )}
          {typeof prize === 'number' && prize > 0 && (
            <div className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold w-fit border border-green-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7"></circle><polyline points="8 4 8 8 11.5 11.5"></polyline><path d="M16 16v.01"></path><path d="M12 21h9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"></path><path d="M22 10h-4"></path></svg>
              +{prize}
            </div>
          )}
        </div>
      </div>

      {/* 3. Survival Time & Round */}
      <div className="flex flex-col text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">{formatTftRound(p.lastRound)}</span>
        <span>{formatTime(p.timeEliminated)}</span>
      </div>

      {/* 4. Comp: traits + augments + units */}
      <div className="flex flex-col gap-2 min-w-0 justify-center">
        {/* Traits & Augments Row */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTraits.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {activeTraits.map((t, i) => <TraitCell key={`t-${i}`} trait={t} />)}
            </div>
          )}
          {p.augments && p.augments.length > 0 && (
            <>
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
              <div className="flex gap-1">
                {p.augments.map((aug, i) => <AugmentCell key={`a-${i}`} augment={aug} />)}
              </div>
            </>
          )}
        </div>

        {/* Units */}
        <div className="flex flex-wrap gap-1.5">
          {sortedUnits.map((unit, i) => <UnitCell key={`u-${i}`} unit={unit} />)}
        </div>
      </div>

      {/* 5. Stats */}
      <div className="flex flex-col items-end justify-center gap-1 text-[11px] text-right">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <span className="text-zinc-500">Lvl</span> <span className="font-semibold text-[13px]">{p.level}</span>
        </div>
        {p.totalDamage > 0 && <span className="text-zinc-400">{p.totalDamage.toLocaleString()} <span className="text-zinc-600">dmg</span></span>}
        {p.playersEliminated > 0 && <span className="text-zinc-400">{p.playersEliminated} <span className="text-zinc-600">elim</span></span>}
        <span className="text-amber-400/90 font-medium">{p.goldLeft} <span className="text-amber-500/50">g</span></span>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

interface MatchCompPanelProps {
  matchData: GrimoireMatchData;
  /** Optional: map of puuid → { placement, points, prize? } from MatchResult records */
  resultMap?: Record<string, { placement: number; points: number; prize?: number }>;
  /** Highlight this PUUID (the current viewer) */
  highlightPuuid?: string;
}

export function MatchCompPanel({ matchData, resultMap, highlightPuuid }: MatchCompPanelProps) {
  if (!matchData?.participants?.length) {
    return <p className="text-muted-foreground text-sm">No match data available.</p>;
  }

  // Sort by placement
  const sorted = [...matchData.participants].sort((a, b) => a.placement - b.placement);

  const duration = matchData.gameDuration
    ? formatDuration(Math.floor(matchData.gameDuration))
    : null;

  return (
    <div className="space-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b border-zinc-800 mb-2">
        <span>
          TFT Set {matchData.tftSetNumber ?? '?'}
          {duration && <> · {duration}</>}
        </span>
        <span className="font-mono text-zinc-600 text-[10px]">{matchData.matchId}</span>
      </div>

      {/* Participant rows */}
      <div className="space-y-1.5">
        {sorted.map((p, index) => {
          const mapped = resultMap?.[p.puuid];
          const points = mapped?.points;
          const prize = mapped?.prize;

          return (
            <ParticipantRow
              key={p.puuid || index}
              p={p}
              points={points}
              prize={prize}
              highlightPuuid={highlightPuuid}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isGrimoireMatchData(data: unknown): data is GrimoireMatchData {
  return Boolean(
    data && typeof data === 'object' &&
    'participants' in (data as object) &&
    'matchId' in (data as object)
  );
}
