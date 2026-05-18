"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl";
import { Info, DollarSign, Wallet, Globe, Users, ScrollText, ShieldCheck, Target, Layers, Medal, Trophy, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ITournament } from '@/app/types/tournament';
import { useCurrency } from '@/app/contexts/currency-context';

interface TournamentDetailsTabProps {
  tournament: ITournament;
}

export const TournamentDetailsTab: React.FC<TournamentDetailsTabProps> = ({ tournament }) => {
  const t = useTranslations("common");  
  const { currency, usdToVndRate } = useCurrency();

  // VND mode: số tiền từ backend đã là VND
  const displayMoney = (amount: number) => {
    const displayAmount = currency === "USD" && usdToVndRate > 0 ? amount / usdToVndRate : amount;
    const locale = currency === "VND" ? "vi-VN" : "en-US";
    const fractionDigits = currency === "VND" ? 0 : 2;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(displayAmount);
  };

  // Format VND thuần (luôn hiển thị VND)
  const formatVndLocal = (vndAmount: number) => {
    if (vndAmount <= 0) return null;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vndAmount);
  };

  // ── Dynamic Prize Ranks (with default fallback) ─────────────────────
  const getPrizeRanks = (): string[] => {
    const ps = getCashPrizeStructure();
    const flex = getFlexCoinPrizeStructure();
    const flexRanks = Object.keys(flex || {});
    if (ps && Object.keys(ps).length > 0) {
      const cashRanks = Array.isArray(ps)
        ? ps.map((_, i) => String(i + 1))
        : Object.keys(ps);
      return Array.from(new Set([...cashRanks, ...flexRanks])).sort((a, b) => Number(a) - Number(b));
    }
    if (flexRanks.length > 0) {
      return flexRanks.sort((a, b) => Number(a) - Number(b));
    }
    // Default: 4 ranks with 40/30/20/10
    return ['1', '2', '3', '4'];
  };

  // Get prize percentage for a given rank with fallback
  const getPrizePercentage = (rank: string): number => {
    const ps = getCashPrizeStructure();
    const defaultPercentages: Record<string, number> = { '1': 0.4, '2': 0.3, '3': 0.2, '4': 0.1 };
    
    if (!ps || Object.keys(ps).length === 0) {
      return defaultPercentages[rank] || 0;
    }
    
    const isArray = Array.isArray(ps);
    const raw = isArray ? ps[parseInt(rank) - 1] : ps[rank];
    if (raw === undefined || raw === null) return 0;
    
    return raw > 1 ? raw / 100 : raw;
  };

  const getCashPrizeStructure = () => {
    const ps: any = tournament.prizeStructure;
    if (ps && !Array.isArray(ps) && typeof ps === "object" && ps.cash) {
      return ps.cash;
    }
    return ps;
  };

  const getFlexCoinPrizeStructure = (): Record<string, number> => {
    const ps: any = tournament.prizeStructure;
    if (ps && !Array.isArray(ps) && typeof ps === "object" && ps.flexCoin) {
      return ps.flexCoin;
    }
    return {};
  };

  const rankSuffix = (rank: string) => {
    const num = parseInt(rank);
    if (isNaN(num)) return rank;
    if (num % 10 === 1 && num % 100 !== 11) return `${num}st`;
    if (num % 10 === 2 && num % 100 !== 12) return `${num}nd`;
    if (num % 10 === 3 && num % 100 !== 13) return `${num}rd`;
    return `${num}th`;
  };

  const prizeRanks = getPrizeRanks();
  const flexCoinPrizeStructure = getFlexCoinPrizeStructure();
  const isTrusted = (tournament as any).organizer?.partnerSubscription?.plan === 'PRO' || (tournament as any).organizer?.partnerSubscription?.plan === 'ENTERPRISE';
  const isEscrow = !tournament.isCommunityMode && !isTrusted;

  // Gross Prize Pool: entryFee × maxPlayers (hoặc customPrizePool/escrowRequiredAmount)
  const grossPrizePool = Math.max(
    tournament.escrowRequiredAmount || 0,
    tournament.entryFee * tournament.maxPlayers,
    tournament.budget || 0
  );

  // Net Prize Pool (sau phí) cho prize distribution
  const netPrizePool = tournament.budget || 0;

  // ── Scoring System Helpers ───────────────────────────────────────────
  const getPhaseTypeLabel = (type: string) => {
    switch(type) {
      case 'elimination': return 'Elimination (Loại trực tiếp)';
      case 'points': return 'Points (Tính điểm)';
      case 'swiss': return 'Swiss (Thụy Sĩ)';
      case 'round_robin': return 'Round Robin (Vòng tròn)';
      case 'checkmate': return 'Checkmate (Ngưỡng điểm)';
      default: return type;
    }
  };

  const getPhaseTypeIcon = (type: string) => {
    switch(type) {
      case 'elimination': return <Target className="h-4 w-4" />;
      case 'points': return <Medal className="h-4 w-4" />;
      case 'swiss': return <Layers className="h-4 w-4" />;
      case 'round_robin': return <Users className="h-4 w-4" />;
      case 'checkmate': return <Trophy className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getPhaseTypeDescription = (phase: any) => {
    const ac = phase.advancementCondition as { type: string; value?: number } | null;
    switch(phase.type) {
      case 'elimination':
        return `Top ${ac?.value || 4} scores advance each round. Lowest performers are eliminated.`;
      case 'points':
        return `Players play ${phase.matchesPerRound || 1} match(es) per round. Scores accumulate; top ${ac?.value || 4} advance.`;
      case 'swiss':
        return `Players play ${phase.matchesPerRound || 3} matches total. Opponents are matched by similar record. Top ${ac?.value || 4} advance.`;
      case 'round_robin':
        return `Each player plays every other player once. Top ${ac?.value || 4} advance.`;
      case 'checkmate':
        return `Players must reach a points threshold, then secure a 1st place finish to win.`;
      default:
        return ac ? `Top ${ac.value} advance per round.` : 'Standard format.';
    }
  };

  // Render points mapping table (e.g. Top1=10pts, Top2=8pts...)
  const renderPointsMapping = (phase: any) => {
    const mapping = phase.pointsMapping;
    if (!mapping || (Array.isArray(mapping) && mapping.length === 0) || Object.keys(mapping).length === 0) return null;

    const isArray = Array.isArray(mapping);
    const entries = isArray
      ? mapping.map((pts: number, idx: number) => ({ rank: idx + 1, pts }))
      : Object.keys(mapping).sort((a, b) => Number(a) - Number(b)).map(key => ({ rank: Number(key), pts: mapping[key] }));
    
    // Lọc bỏ rank có pts = 0 không cần hiển thị (placement 8 được 0pts thì không show)
    const filtered = entries.filter(e => e.pts > 0);
    if (filtered.length === 0) return null;

    return (
      <div className="mt-2">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Points per Placement:</p>
        <div className="flex flex-wrap gap-1">
          {filtered.map(e => (
            <span key={e.rank} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
              <span className="font-medium">#{e.rank}</span>
              <span className="text-emerald-400 font-bold">{e.pts}pts</span>
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Basic Info ──────────────────────────────────────────────────── */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="mr-2 h-5 w-5 text-primary" />
            {t("tournament_details")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Financial Information */}
          <div className="space-y-2">
            <h4 className="font-bold">{t("financial_information")}</h4>
            <div className="flex items-start">
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{t("registration_fee")}:</span>
              <div className="ml-auto text-right">
                <div className="font-medium">{displayMoney(tournament.entryFee)}</div>
              </div>
            </div>
            <div className="flex items-start">
              <Wallet className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{t("gross_prize_pool")}:</span>
              <div className="ml-auto text-right flex flex-col items-end">
                <div className="font-medium">{displayMoney(grossPrizePool)}</div>
                {(tournament.hostFeePercent ?? 0) > 0 && (
                  <span className="text-[10px] text-muted-foreground">Host Fee: {((tournament.hostFeePercent ?? 0) * 100).toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <Wallet className="mr-2 h-4 w-4 text-emerald-400 mt-0.5" />
              <span className="text-muted-foreground">Net Prize Pool (for players):</span>
              <div className="ml-auto text-right">
                <div className="font-medium text-emerald-400">{displayMoney(tournament.budget || 0)}</div>
              </div>
            </div>
          </div>

          {/* Tournament Organization */}
          <div className="space-y-2">
            <h4 className="font-bold">{t("tournament_organization")}</h4>
            <div className="flex items-center">
              <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("region")}:</span>
              <span className="ml-auto font-medium">{tournament.region || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("max_players")}:</span>
              <span className="ml-auto font-medium">{tournament.maxPlayers}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Scoring System & Phase Configuration ─────────────────────── */}
      {tournament.phases && tournament.phases.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Target className="mr-2 h-5 w-5 text-primary" />
              Scoring System & Format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournament.phases.map((phase, idx) => {
              const ac = phase.advancementCondition as { type: string; value?: number } | null;
              return (
              <div key={phase.id} className={`p-4 rounded-xl border ${idx === 0 ? 'bg-violet-500/5 border-violet-500/20' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      {getPhaseTypeIcon(phase.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{phase.name || `Phase ${phase.phaseNumber}`}</h4>
                      <span className="text-[10px] font-medium text-muted-foreground">{getPhaseTypeLabel(phase.type)}</span>
                    </div>
                  </div>
                  {phase.carryOverScores && (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                      Carry Scores
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-3">{getPhaseTypeDescription(phase)}</p>

                {/* Points Mapping Table */}
                {renderPointsMapping(phase)}

                {/* Advancement info */}
                {ac && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <ArrowRight className="h-3 w-3 text-emerald-400" />
                    <span className="text-muted-foreground">
                      Advance: <strong className="text-emerald-400">Top {ac.value}</strong>
                      {ac.type === 'top_n_scores' ? ' by score' : ' by placement'}
                    </span>
                  </div>
                )}

                {/* Phase transition arrow */}
                {idx < tournament.phases.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-30" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
        </Card>
      )}

      {/* ── Prize Distribution ─────────────────────────────────────────── */}
      {prizeRanks.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Wallet className="mr-2 h-5 w-5 text-primary" />
              {t("prize_distribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {prizeRanks.map(rank => {
              const totalPrizePool = tournament.budget || 0;
              const prizePercentage = getPrizePercentage(rank);
              const flexCoinAmount = Number(flexCoinPrizeStructure[rank] || 0);
              
              if (prizePercentage === 0 && flexCoinAmount === 0) return null;

              const prizeAmount = totalPrizePool * prizePercentage;

              return (
                <Card key={rank} className="flex flex-col items-center justify-center p-4 border shadow-sm bg-muted/40 text-center">
                  <span className="text-lg font-bold text-yellow-500">{rankSuffix(rank)}</span>
                  {prizePercentage > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">{(prizePercentage * 100).toFixed(1)}%</span>
                      <span className="text-md font-medium">{displayMoney(prizeAmount)}</span>
                    </>
                  )}
                  {flexCoinAmount > 0 && (
                    <span className="text-xs font-semibold text-amber-500">
                      +{flexCoinAmount.toLocaleString()} F coin
                    </span>
                  )}
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Trust & Escrow ──────────────────────────────────────── */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
            {isTrusted ? "Trusted Partner" : isEscrow ? "Escrow Secured" : t("community_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <div className={`p-4 rounded-lg border ${isTrusted ? 'bg-emerald-500/5 border-emerald-500/20' : isEscrow ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
            <p className="font-medium mb-1">{isTrusted ? "Verified Trusted Partner" : isEscrow ? "Escrow Secured Tournament" : t("community_title")}</p>
            <p className="text-muted-foreground">{isTrusted ? "This tournament is hosted by a Verified Trusted Partner. Prize pool is secured and guaranteed by the platform." : isEscrow ? "This tournament is secured by an escrow fund. Organizer has deposited the prize pool upfront for player protection." : t("community_desc")}</p>
            {(isEscrow || isTrusted) && tournament.escrowRequiredAmount && (
                <div className="mt-2 font-bold text-emerald-600 dark:text-emerald-400">
                  <p>{t("guaranteed_pool")}: {displayMoney(tournament.escrowRequiredAmount)}</p>
                </div>
            )}
          </div>
          
          {tournament.description && (
            <div>
              <h4 className="font-bold flex items-center gap-2 mb-2">
                <ScrollText className="h-4 w-4 text-primary" />
                {t("additional_information")}
              </h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 
