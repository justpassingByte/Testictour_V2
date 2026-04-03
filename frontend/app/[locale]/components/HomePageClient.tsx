"use client"

import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { Calendar, Clock, MapPin, ChevronRight, ArrowRight, Gamepad2, Users, Coins, DollarSign, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ITournament } from "@/app/types/tournament"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

import TournamentDirectoryClient from "./TournamentDirectoryClient"
import { useTranslations } from 'next-intl';

const defaultTFTImage = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80"

interface HomePageClientProps {
  tournaments: ITournament[];
  lobbies: MiniTourLobby[];
}

export default function HomePageClient({ tournaments, lobbies }: HomePageClientProps) {
  const featuredTournaments = tournaments
    .filter((t) => t.status === "in_progress")
    .slice(0, 2)

  // Show top 3 active/waiting lobbies
  const featuredLobbies = lobbies
    .filter((l) => l.status === "WAITING" || l.status === "IN_PROGRESS")
    .slice(0, 3)

  const t = useTranslations('common');

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-pattern py-16 md:py-24 border-b">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                <span className="gradient-text">{t('hero_title_part1')}</span> {t('hero_title_part2')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('hero_description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/tournaments">{t('browse_tournaments')}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/leaderboard">{t('leaderboard')}</Link>
                </Button>
              </div>
            </div>
            <div className="relative animate-slide-up">
              <div className="aspect-[4/3] rounded-lg overflow-hidden border shadow-lg">
                <Image
                  width={800}
                  height={600}
                  src={defaultTFTImage}
                  alt="TFT Tournament"
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-transparent p-4 rounded-lg border shadow-md">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-live-update animate-pulse"></div>
                  <span className="font-medium">
                    {t('live_tournaments')}: {tournaments.filter((t) => t.status === "in_progress").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t('featured_tournaments')}</h2>
              <p className="text-muted-foreground">{t('featured_tournaments_description')}</p>
            </div>
            <Link href="/tournaments" className="group flex items-center text-primary mt-4 md:mt-0">
              {t('view_all_tournaments')}
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {featuredTournaments.map((tournament, index) => (
              <FeaturedTournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── MiniTour Lobbies Section ─── */}
      <section className="py-12 bg-primary/5 border-y">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="h-7 w-7 text-primary" />
                <h2 className="text-3xl font-bold">
                  {t('minitour_lobbies_title', { defaultValue: 'MiniTour Lobbies' })}
                </h2>
              </div>
              <p className="text-muted-foreground">
                {t('minitour_lobbies_description', { defaultValue: 'Jump into quick matches — join a lobby and compete for instant prizes.' })}
              </p>
            </div>
            <Link href="/minitour" className="group flex items-center text-primary mt-4 md:mt-0 font-medium">
              {t('view_all_lobbies', { defaultValue: 'View All Lobbies' })}
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {featuredLobbies.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredLobbies.map((lobby, index) => (
                <MiniTourLobbyCard key={lobby.id} lobby={lobby} index={index} />
              ))}
            </div>
          ) : (
            <Card className="bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20">
              <CardContent className="py-12 text-center">
                <Gamepad2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">
                  {t('no_active_lobbies', { defaultValue: 'No active lobbies right now. Check back soon!' })}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/minitour">
                    {t('browse_all_lobbies', { defaultValue: 'Browse All Lobbies' })}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Tournament Directory - Client Component with Suspense */}
      <Suspense fallback={<TournamentDirectorySkeleton />}>
        <TournamentDirectoryClient tournaments={tournaments} />
      </Suspense>

      {/* Call to Action */}
      <section className="py-16 bg-primary/5 border-y">
        <div className="container">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">{t('cta_title')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('cta_description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link href="/tournaments">{t('find_tournament')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/profile">{t('create_account')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// Featured Tournament Card Component
function FeaturedTournamentCard({ tournament, index }: { tournament: ITournament, index: number }) {
  const t = useTranslations('common');
  return (
    <Card 
      className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Link href={`/tournaments/${tournament.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            width={600}
            height={338}
            src={tournament.image || defaultTFTImage}
            alt={tournament.name}
            className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          />
          <div className="absolute inset-0 bg-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-bold text-white hover:underline drop-shadow-md">{tournament.name}</h3>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="bg-primary/80 text-white border-none">
                {t(tournament.status as any)}
              </Badge>
              <Badge variant="outline" className="ml-2 bg-transparent text-white backdrop-blur-sm border-white/50">
                {t(tournament.region as any)}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
      <CardContent className="p-6">
        <div className="grid gap-2">
          <div className="flex items-center text-sm">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{new Date(tournament.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center text-sm">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{new Date(tournament.startTime).toLocaleTimeString()} {t('utc')}</span>
          </div>
          <div className="flex items-center text-sm">
            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{t('region_label', { region: tournament.region })}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button asChild className="w-full">
          <Link href={`/tournaments/${tournament.id}`}>{t('view_tournament')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

// MiniTour Lobby Card Component
function MiniTourLobbyCard({ lobby, index }: { lobby: MiniTourLobby, index: number }) {
  const t = useTranslations('common');

  const getStatusColor = (status: string) => {
    switch (status) {
      case "WAITING": return "bg-green-500/20 text-green-500 border-green-500/30"
      case "IN_PROGRESS": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card
      className="overflow-hidden card-hover-effect bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-1 bg-gradient-to-r from-primary/50 to-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{lobby.name}</CardTitle>
          <Badge variant="outline" className={getStatusColor(lobby.status)}>
            {lobby.status === "WAITING" ? t('status_waiting', { defaultValue: 'Waiting' }) : t('in_progress')}
          </Badge>
        </div>
        {lobby.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{lobby.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t('players', { defaultValue: 'Players' })}
            </span>
            <span className="font-medium">{lobby.currentPlayers}/{lobby.maxPlayers}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              {lobby.entryType === "coins" ? <Coins className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
              {t('entry_fee', { defaultValue: 'Entry' })}
            </span>
            <span className="font-medium">{lobby.entryFee}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              {t('prize_pool', { defaultValue: 'Prize' })}
            </span>
            <span className="font-bold text-primary">{lobby.prizePool}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {t('rating', { defaultValue: 'Rating' })}
            </span>
            <span className="font-medium">{lobby.averageRating}</span>
          </div>
        </div>

        <Button asChild className="w-full" variant={lobby.status === "IN_PROGRESS" ? "outline" : "default"}>
          <Link href={`/minitour/lobbies/${lobby.id}`}>
            {lobby.status === "WAITING"
              ? t('join_lobby', { defaultValue: 'Join Lobby' })
              : t('view_lobby', { defaultValue: 'View Lobby' })
            }
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// Skeleton loader for Tournament Directory
function TournamentDirectorySkeleton() {
  const t = useTranslations('common');
  return (
    <section className="py-12 bg-background/60 dark:bg-background/40 backdrop-blur-lg border-t border-b border-white/20">
      <div className="container space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">{t('tournament_directory')}</h2>
          <p className="text-muted-foreground">{t('loading_tournaments')}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[16/9] bg-muted rounded-md mb-4"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}