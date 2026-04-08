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
  const border = TRAIT_STYLE_BORDER[trait.style] ?? 'border-zinc-600';
  const bg = trait.style === 4 ? 'bg-fuchsia-900/30' : trait.style === 3 ? 'bg-yellow-900/20' : trait.style >= 1 ? 'bg-zinc-700/40' : 'bg-zinc-800/30';
  const textColor = trait.style === 4 ? 'text-fuchsia-300' : trait.style === 3 ? 'text-yellow-300' : trait.style === 2 ? 'text-slate-300' : trait.style === 1 ? 'text-amber-600' : 'text-zinc-500';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative flex items-center gap-[3px] px-1 py-0.5 rounded border ${border} ${bg} ${trait.style === 0 ? 'opacity-40' : ''}`}>
            <div className="relative w-4 h-4 flex-shrink-0">
              {trait.iconUrl
                ? <Image src={trait.iconUrl} alt={trait.displayName} fill className="object-contain" unoptimized sizes="16px" />
                : <span className={`text-[8px] ${textColor}`}>{trait.displayName.slice(0, 2)}</span>
              }
            </div>
            <span className={`text-[10px] font-semibold tabular-nums ${textColor}`}>{trait.numUnits}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="z-50">
          <p className="font-semibold">{trait.displayName}</p>
          <p className="text-xs text-muted-foreground">{trait.numUnits} / {trait.tierTotal}</p>
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

// ── Participant Row ───────────────────────────────────────────────────────────

function ParticipantRow({ p, points, highlightPuuid }: {
  p: GrimoireParticipantData;
  points?: number;
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
    <div className={`grid gap-2 p-3 rounded-lg border transition-colors ${
      isHighlight ? 'bg-primary/5 border-primary/30' : 'bg-zinc-900/40 border-zinc-800/60'
    }`}
      style={{ gridTemplateColumns: '56px 1fr auto' }}
    >
      {/* Placement + meta */}
      <div className="flex flex-col items-center justify-start gap-1 pt-0.5">
        <div className={`flex items-center justify-center w-9 h-9 rounded-full border text-lg font-bold tabular-nums ${placementColor}`}>
          {p.placement}
        </div>
        {typeof points === 'number' && (
          <span className="text-[10px] text-muted-foreground">{points} pts</span>
        )}
        <div className="text-center mt-1">
          <p className="text-[10px] text-zinc-300 font-medium leading-tight truncate max-w-[50px]">{p.gameName}</p>
          <p className="text-[9px] text-zinc-500">#{p.tagLine}</p>
        </div>
      </div>

      {/* Comp: traits + augments + units */}
      <div className="flex flex-col gap-2 min-w-0">
        {/* Traits row */}
        {activeTraits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeTraits.map((t, i) => <TraitCell key={i} trait={t} />)}
          </div>
        )}

        {/* Augments */}
        {p.augments && p.augments.length > 0 && (
          <div className="flex gap-1">
            {p.augments.map((aug, i) => <AugmentCell key={i} augment={aug} />)}
          </div>
        )}

        {/* Units */}
        <div className="flex flex-wrap gap-1.5">
          {sortedUnits.map((unit, i) => <UnitCell key={i} unit={unit} />)}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col items-end justify-start gap-1 text-xs text-right min-w-[52px]">
        <span className="text-zinc-400">Lvl {p.level}</span>
        {p.totalDamage && <span className="text-zinc-500">{p.totalDamage.toLocaleString()} dmg</span>}
        {p.playersEliminated > 0 && <span className="text-zinc-500">{p.playersEliminated} elim</span>}
        <span className="text-zinc-600">{p.goldLeft}g</span>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

interface MatchCompPanelProps {
  matchData: GrimoireMatchData;
  /** Optional: map of puuid → { placement, points } from MatchResult records */
  resultMap?: Record<string, { placement: number; points: number }>;
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
        {sorted.map((p) => {
          const result = resultMap?.[p.puuid];
          const points = result?.points;
          return (
            <ParticipantRow
              key={p.puuid}
              p={p}
              points={points}
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
