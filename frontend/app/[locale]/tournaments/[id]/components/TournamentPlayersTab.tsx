import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IParticipant } from "@/app/types/tournament"
import { Users, Loader2, Trophy, Target, Gamepad2, ArrowRight, Copy, Check } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { TournamentService } from "@/app/services/TournamentService"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TournamentPlayersTabProps {
  tournamentId: string;
  actualParticipantsCount?: number;
}

import { getSubRegionConfig } from "@/app/config/regions";

function ParticipantRow({ participant, index, t }: { participant: IParticipant, index: number, t: any }) {
  const name = participant.user?.riotGameName || participant.user?.username || participant.inGameName;
  const tag = participant.user?.riotGameTag || participant.gameSpecificId;
  const rank = participant.rank || "UNRANKED";
  const regionCode = participant.user?.subRegion || participant.user?.region || participant.region || 'VN';
  const regionConfig = getSubRegionConfig(regionCode);
  const regionName = regionConfig ? `${regionConfig.flag} ${regionConfig.id}` : regionCode.toUpperCase();

  const [copiedId, setCopiedId] = useState(false)
  const handleCopyId = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(`Participant ID: ${participant.id}`)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <TableRow className="group/row hover:bg-muted/30 transition-colors">
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="w-6 text-center text-muted-foreground font-semibold">#{index + 1}</div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-primary/90 group-hover/row:text-primary transition-colors">{name}</span>
              <button 
                onClick={handleCopyId}
                className="opacity-0 group-hover/row:opacity-100 transition-all duration-300 flex items-center justify-center p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
                title="Copy Participant ID for Support"
              >
                {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">#{tag} ({regionName})</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="uppercase text-[10px] bg-primary/5 text-primary border-primary/20">
          {rank}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/players/${participant.userId || participant.user?.id || ''}`}>
          <Button variant="ghost" size="sm" className="opacity-70 group-hover/row:opacity-100 group-hover/row:bg-primary/20 group-hover/row:text-primary transition-all">
            {t("profile")} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

const PLAYERS_PER_PAGE = 20;

export function TournamentPlayersTab({ tournamentId, actualParticipantsCount }: TournamentPlayersTabProps) {
  const t = useTranslations("common");
  const [participants, setParticipants] = useState<IParticipant[]>([]);
  const [total, setTotal] = useState(actualParticipantsCount || 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const res = await TournamentService.listParticipants(tournamentId, pageNum, PLAYERS_PER_PAGE);
      if (append) {
        setParticipants(prev => [...prev, ...(res.participants || [])]);
      } else {
        setParticipants(res.participants || []);
      }
      if (res.total !== undefined) setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tournamentId]);

  // Fetch first page on mount
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  };

  const hasMore = participants.length < total;

  if (loading) {
    return (
      <Card className="border shadow-sm bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/10">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">{t("loading")}...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/10">
      <CardHeader className="bg-muted/20 border-b border-white/5 py-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-primary" />
            {t("registered_participants")}
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {participants.length} / {total} {t("total")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {participants && participants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/10">
                    <TableHead className="w-[300px]">{t("player")}</TableHead>
                    <TableHead>{t("rank")}</TableHead>
                    <TableHead className="text-right">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant, index) => (
                    <ParticipantRow key={participant.id} participant={participant} index={index} t={t} />
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {hasMore && (
              <div className="flex justify-center p-6 border-t border-white/5">
                <Button 
                  onClick={handleLoadMore} 
                  disabled={loadingMore}
                  variant="outline"
                  className="rounded-full px-8 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all font-semibold"
                >
                  {loadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  ) : null}
                  {t("load_more_participants")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">{t("no_players_registered")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}