"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowRight, Calendar, Clock, MapPin, ChevronDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslations } from 'next-intl'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ITournament } from '@/app/types/tournament'
import { useTournamentStore } from '@/app/stores/tournamentStore'

interface TournamentsClientPageProps {
  initialTournaments: ITournament[]
}

export default function TournamentsClientPage({ initialTournaments }: TournamentsClientPageProps) {
  // Use next-intl translations
  const t = useTranslations('common')
  
  // Initialize store with server-fetched data
  const { tournaments, loading, error, fetchTournaments } = useTournamentStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>("date")

  // On initial load, use the server-fetched tournaments
  const [displayedTournaments, setDisplayedTournaments] = useState<ITournament[]>(initialTournaments)

  useEffect(() => {
    // Refresh tournaments from API to get latest data
    fetchTournaments()
  }, [fetchTournaments])

  useEffect(() => {
    // Use tournaments from store once loaded, otherwise use initial data
    if (tournaments && tournaments.length > 0) {
      setDisplayedTournaments(tournaments)
    }
  }, [tournaments])

  // Filter tournaments based on search, region, and status
  const filteredTournaments = displayedTournaments.filter((tournament) => {
    const matchesSearch =
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tournament.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) 
    const matchesRegion = !selectedRegion || selectedRegion === "all" || tournament.region === selectedRegion
    const matchesStatus = !selectedStatus || selectedStatus === "all" || tournament.status === selectedStatus

    return matchesSearch && matchesRegion && matchesStatus
  })

  // Sort tournaments
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name)
      case "date":
        const dateA = new Date(a.startTime)
        const dateB = new Date(b.startTime)
        return dateA.getTime() - dateB.getTime()
      case "participants":
        return (b.registered || 0) - (a.registered || 0) 
      case "registrationFee":
        return (a.entryFee || 0) - (b.entryFee || 0) 
      default:
        return 0
    }
  })

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedRegion(null)
    setSelectedStatus(null)
  }

  if (error) {
    return <div className="container py-10 text-center text-red-500">Error: {error}</div>
  }

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("tournaments")}</h1>
        <p className="text-muted-foreground">Browse and register for Teamfight Tactics tournaments around the world.</p>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedRegion || "all"} onValueChange={(value) => setSelectedRegion(value || null)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("region")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="AP">AP</SelectItem>
                <SelectItem value="NA">NA</SelectItem>
                <SelectItem value="EUW">EUW</SelectItem>
                <SelectItem value="KR">KR</SelectItem>
                <SelectItem value="OCE">OCE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value || null)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_status")}</SelectItem>
                <SelectItem value="in_progress">{t("ongoing")}</SelectItem>
                <SelectItem value="UPCOMING">{t("upcoming")}</SelectItem>
                <SelectItem value="COMPLETED">{t("finished")}</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  {t("sort")}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setSortBy("date")}>
                    <span className={sortBy === "date" ? "font-medium" : ""}>Date</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    <span className={sortBy === "name" ? "font-medium" : ""}>Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("participants")}>
                    <span className={sortBy === "participants" ? "font-medium" : ""}>Participants</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("registrationFee")}>
                    <span className={sortBy === "registrationFee" ? "font-medium" : ""}>Registration Fee</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{t("showing_tournaments", { count: sortedTournaments.length })}</div>
          <SyncStatus status="live" />
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">{t("all")}</TabsTrigger>
          <TabsTrigger value="in_progress">
            <span className="flex items-center">
              {t("ongoing")}
              <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                {displayedTournaments.filter((t) => t.status === "in_progress").length}
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger value="UPCOMING">
            <span className="flex items-center">
              {t("upcoming")}
              <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                {displayedTournaments.filter((t) => t.status === "UPCOMING").length}
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger value="COMPLETED">
            <span className="flex items-center">
              {t("finished")}
              <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                {displayedTournaments.filter((t) => t.status === "COMPLETED").length}
              </Badge>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTournaments.map((tournament, index) => (
              <TournamentCard key={tournament.id} tournament={tournament} index={index} />
            ))}
            {sortedTournaments.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {t("no_tournaments_match")}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="in_progress" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTournaments
              .filter((t) => t.status === "in_progress")
              .map((tournament, index) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={index}/>
              ))}
            {sortedTournaments.filter((t) => t.status === "in_progress").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {t("no_ongoing_tournaments")}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="UPCOMING" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTournaments
              .filter((t) => t.status === "UPCOMING")
              .map((tournament, index) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={index}/>
              ))}
            {sortedTournaments.filter((t) => t.status === "UPCOMING").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {t("no_upcoming_tournaments")}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="COMPLETED" className="mt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTournaments
              .filter((t) => t.status === "COMPLETED")
              .map((tournament, index) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={index}/>
              ))}
            {sortedTournaments.filter((t) => t.status === "COMPLETED").length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {t("no_completed_tournaments")}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TournamentCard({ tournament, index }: { tournament: ITournament; index: number }) {
  const t = useTranslations('common');
  const statusColors = {
    in_progress: "bg-primary/20 text-primary border-primary/20 animate-pulse-subtle",
    UPCOMING: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
    COMPLETED: "bg-muted text-muted-foreground border-muted",
    REGISTRATION: "bg-blue-500/20 text-blue-500 border-blue-500/20",
    DRAFT: "bg-gray-500/20 text-gray-500 border-gray-500/20",
    CANCELLED: "bg-red-500/20 text-red-500 border-red-500/20"
  }

  const statusKey = tournament.status as keyof typeof statusColors;
  const statusColor = statusColors[statusKey] || statusColors.COMPLETED; 

  const formattedDate = new Date(tournament.startTime).toLocaleDateString();
  const formattedTime = new Date(tournament.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const registrationFeeDisplay = tournament.entryFee === 0 ? '0' : `$${tournament.entryFee}`;

  // Helper to safely translate status
  const getStatusTranslation = (status: string) => {
    const key = status.toLowerCase();
    return t.has(key) ? t(key) : status.replace(/_/g, ' ');
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in-up bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader className="p-0">
        <Link href={`/tournaments/${tournament.id}`} className="block">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              width={400}
              height={225}
              src={tournament.image || "/TFT.jfif"}
              alt={tournament.name}
              className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
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
          <div className="flex items-center justify-between text-sm mt-2">
            <span>{t('registration_fee')}:</span>
            <span className="font-medium">{registrationFeeDisplay}</span>
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
          <Button variant="ghost" className="flex items-center gap-1">
            {t('view')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
        {tournament.status === "UPCOMING" && (tournament.registered || 0) < tournament.maxPlayers && (
          <Link href={`/tournaments/${tournament.id}/register`}>
            <Button>{t('register_now')}</Button>
          </Link>
        )}
        {tournament.status === "UPCOMING" && (tournament.registered || 0) >= tournament.maxPlayers && (
          <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10">
            Full
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
} 