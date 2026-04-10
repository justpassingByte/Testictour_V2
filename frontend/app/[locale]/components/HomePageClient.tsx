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

const defaultTFTImage = "/tft_user_upload.png"

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
)

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
      <section className="hero-pattern py-8 md:py-16 border-b overflow-hidden relative">
        <div className="w-full px-4 sm:px-8 xl:px-12 mx-auto max-w-[2560px]">
          <div className="flex flex-col lg:flex-row gap-8 xl:gap-16 items-center w-full">
            {/* Left Column: Text content wrapped in Vegas Background Panel */}
            <div className="w-full lg:w-[68%] xl:w-[72%] relative p-8 md:p-14 lg:p-20 xl:p-24 rounded-[3rem] overflow-hidden shadow-2xl border border-primary/20 group min-h-[550px] md:min-h-[650px] xl:min-h-[750px] flex flex-col justify-center">
              {/* Vegas Background Layer */}
              <div className="absolute inset-0 z-0 bg-slate-950">
                <Image
                  fill
                  src="/hero-bg.png"
                  alt="Vegas Stage Background"
                  className="object-cover transition-transform duration-[10s] ease-out group-hover:scale-105 opacity-80"
                  priority
                />
                {/* Uniform subtle darkening to ensure text readability without hiding the image */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
              </div>

              <div className="relative z-10 space-y-8 animate-fade-in">
                <h1 className="text-[40px] md:text-[48px] lg:text-[56px] leading-[1.15] font-bold tracking-tight [text-shadow:_0_2px_10px_rgb(0_0_0_/_0.8)] font-['var(--font-cinzel)']">
                  <span className="gradient-text drop-shadow-md">{t('hero_title_part1')}</span> <br />
                  <span className="text-white drop-shadow-xl">{t('hero_title_part2')}</span>
                </h1>
                <p className="text-base md:text-lg font-medium text-white/95 [text-shadow:_0_2px_4px_rgb(0_0_0_/_0.8)] max-w-2xl">
                  {t('hero_description')}
                </p>
                <div className="flex flex-col sm:flex-row items-center sm:gap-6 gap-4 pt-4 lg:pt-6">
                  <Button asChild className="btn-zodiac text-base px-8 py-6 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-105 text-white">
                    <Link href="/tournaments" className="flex items-center group">
                      Browse <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="bg-background/20 border-2 border-white/20 hover:border-white/50 text-white hover:bg-white/10 hover:text-white rounded-full px-8 py-6 text-base backdrop-blur-md transition-all duration-300 hover:scale-105">
                    <Link
                      href="https://discord.com/invite/R3rez3qDbf"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center group"
                    >
                      <DiscordIcon className="h-5 w-5 mr-2 text-[#5865F2] group-hover:text-[#7289da] transition-colors" />
                      <span>Join Discord</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-[32%] xl:w-[28%] relative animate-slide-up flex items-center justify-center p-4">
              <div className="group relative aspect-square lg:aspect-[3/4] z-10 w-full flex items-center justify-center">
                {/* Layer 1: Floating Characters Background Area (Transparent) */}                {/* Layer 2: Floating Stats Badge */}
                <div
                  className="absolute bottom-4 right-4 md:bottom-2 md:right-2 bg-background/95 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-20"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <span className="font-bold tracking-tight text-lg">
                      {t('live_tournaments')}: <span className="text-primary ml-1">{tournaments.filter((t) => t.status === "in_progress").length}</span>
                    </span>
                  </div>
                </div>

                {/* Foreground Layer: Characters Cutout (Pops out in front) */}
                <div className="absolute inset-0 z-50 pointer-events-none">
                  <Image
                    fill
                    src="/foreground.png"
                    alt="TFT Characters Cutout"
                    className="object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.9)] scale-[1.6] -translate-x-24 xl:-translate-x-40 -translate-y-8 transition-transform duration-500 ease-out group-hover:scale-[1.65]"
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tournaments */}
      <section className="py-12 bg-background/60 dark:bg-background/40 backdrop-blur-lg border-t border-b border-white/20">
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
            <Card className="bg-card shadow-sm border border-white/10">
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
              <Button size="lg" asChild className="text-primary-foreground">
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
      className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in-up bg-card shadow-sm border border-white/10"
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
      <CardFooter className="p-6 pt-0 flex justify-center">
        <Button asChild className="btn-zodiac w-auto">
          <Link href={`/tournaments/${tournament.id}`}>{t('view_tournament')}
            <ArrowRight className="ml-3 h-4 w-4" />
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
      className="overflow-hidden card-hover-effect bg-card shadow-sm border border-white/10 animate-fade-in-up"
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

        <div className="flex pt-2 justify-center">
          <Button asChild className={`btn-zodiac w-auto ${lobby.status === "IN_PROGRESS" ? "opacity-90" : ""}`}>
            <Link href={`/minitour/lobbies/${lobby.id}`}>
              {lobby.status === "WAITING"
                ? t('join_lobby', { defaultValue: 'Join Lobby' })
                : t('view_lobby', { defaultValue: 'View Lobby' })
              }
              <ArrowRight className="ml-3 h-4 w-4" />
            </Link>
          </Button>
        </div>
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