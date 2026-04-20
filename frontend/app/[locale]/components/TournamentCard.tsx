"use client"

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ITournament } from "@/app/types/tournament";
import { useTranslations } from "next-intl";
import { useCurrencyRate } from "@/app/hooks/useCurrencyRate";

const defaultTFTImage = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80";

export function TournamentCard({ tournament, index }: { tournament: ITournament; index?: number }) {
  const t = useTranslations('common');
  const { formatVndText } = useCurrencyRate();
  const statusColors = {
    in_progress: "bg-primary/20 text-primary border-primary/20 animate-pulse-subtle",
    UPCOMING: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
    COMPLETED: "bg-muted text-muted-foreground border-muted",
    REGISTRATION: "bg-blue-500/20 text-blue-500 border-blue-500/20",
    DRAFT: "bg-gray-500/20 text-gray-500 border-gray-500/20",
    CANCELLED: "bg-red-500/20 text-red-500 border-red-500/20"
  };

  const statusKey = tournament.status as keyof typeof statusColors;
  const statusColor = statusColors[statusKey] || statusColors.COMPLETED; 

  const formattedDate = new Date(tournament.startTime).toLocaleDateString();
  const formattedTime = new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const registrationFeeDisplay = tournament.entryFee === 0 ? '0' : `$${tournament.entryFee} USD`;

  // Helper to safely translate status
  const getStatusTranslation = (status: string) => {
    const key = status.toLowerCase();
    return t.has(key) ? t(key) : status.replace(/_/g, ' ');
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up bg-card shadow-sm border border-white/10"
      style={{ animationDelay: `${(index || 0) * 100}ms` }}
    >
      <CardHeader className="p-0">
        <Link href={`/tournaments/${tournament.id}`} className="block">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              width={400}
              height={225}
              src={tournament.image || defaultTFTImage}
              alt={tournament.name}
              className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <Badge variant="outline" className={`${statusColor} capitalize`}>
                {getStatusTranslation(tournament.status)}
              </Badge>
              <Badge variant="outline" className="bg-transparent backdrop-blur-sm">
                {t('region_label', { region: tournament.region })}
              </Badge>
            </div>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-6">
        <Link href={`/tournaments/${tournament.id}`} className="hover:underline">
          <CardTitle className="mb-2 line-clamp-1">{tournament.name}</CardTitle>
        </Link>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{tournament.description}</p>
        <div className="grid gap-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            <span>{formattedTime}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-2 h-4 w-4" />
            <span>{t('region_label', { region: tournament.region })}</span>
          </div>
          <div className="flex items-start justify-between text-sm mt-2">
            <span className="mt-0.5">{t('registration_fee')}:</span>
            <div className="text-right">
              <span className="font-medium">{registrationFeeDisplay}</span>
              {tournament.entryFee > 0 && (
                <div className="text-[10px] text-muted-foreground opacity-80">{formatVndText(tournament.entryFee)}</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>{t('players')}:</span>
            <span className="font-medium">
              {tournament.registered || 0}/{tournament.maxPlayers}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between p-6 pt-0">
        <Link href={`/tournaments/${tournament.id}`}>
          <Button variant="ghost" className="btn-zodiac flex items-center justify-center gap-1 px-6">
            {t('view')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
        {(tournament.status === "UPCOMING" || tournament.status === "REGISTRATION") && (
          <Link href={`/tournaments/${tournament.id}/register`}>
            <Button>{t('register_now')}</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
} 