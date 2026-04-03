"use client"

import { useState, useEffect } from "react"
import { Search, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SyncStatus } from "@/components/sync-status"
import { TournamentCard } from "./TournamentCard"
import { ITournament } from "@/app/types/tournament"
import { useTranslations } from 'next-intl'

interface TournamentDirectoryClientProps {
  tournaments: ITournament[]
}

export default function TournamentDirectoryClient({ tournaments }: TournamentDirectoryClientProps) {
  const [filteredTournaments, setFilteredTournaments] = useState<ITournament[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  
  const t = useTranslations('common')

  // Helper function to safely get translations with fallbacks
  const safeTranslate = (key: string, fallback: string) => {
    try {
      return t(key);
    } catch (error) {
      return fallback;
    }
  };

  useEffect(() => {
    let tempTournaments = [...tournaments]

    if (searchTerm) {
      tempTournaments = tempTournaments.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedRegion && selectedRegion !== "all") {
      tempTournaments = tempTournaments.filter((t) => t.region === selectedRegion)
    }

    if (selectedStatus && selectedStatus !== "all") {
      tempTournaments = tempTournaments.filter((t) => t.status.toLowerCase() === selectedStatus.toLowerCase())
    }

    setFilteredTournaments(tempTournaments)
  }, [tournaments, searchTerm, selectedRegion, selectedStatus])

  return (
    <section className="py-12 bg-background/60 dark:bg-background/40 backdrop-blur-lg border-t border-b border-white/20">
      <div className="container space-y-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">{safeTranslate('tournament_directory', 'Tournament Directory')}</h2>
          <p className="text-muted-foreground">{safeTranslate('browse_tourfilter_tournaments_description', 'Browse and filter tournaments')}</p>
        </div>

        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={safeTranslate('search_tournaments', 'Search tournaments...')}
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedRegion} onValueChange={(value) => setSelectedRegion(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={safeTranslate('region', 'Region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{safeTranslate('all_regions', 'All Regions')}</SelectItem>
                  <SelectItem value="GLOBAL">{safeTranslate('global', 'Global')}</SelectItem>
                  <SelectItem value="AP">{safeTranslate('asia', 'Asia')}</SelectItem>
                  <SelectItem value="NA">{safeTranslate('america', 'America')}</SelectItem>
                  <SelectItem value="EUW">{safeTranslate('europe', 'Europe')}</SelectItem>
                  <SelectItem value="KR">{safeTranslate('asia', 'Asia')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={safeTranslate('status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{safeTranslate('all_status', 'All Status')}</SelectItem>
                  <SelectItem value="in_progress">{safeTranslate('ongoing', 'Ongoing')}</SelectItem>
                  <SelectItem value="UPCOMING">{safeTranslate('upcoming', 'Upcoming')}</SelectItem>
                  <SelectItem value="COMPLETED">{safeTranslate('finished', 'Finished')}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">{safeTranslate('all', 'All')}</TabsTrigger>
              <TabsTrigger value="in_progress">
                <span className="flex items-center">
                  {safeTranslate('ongoing', 'Ongoing')}
                  <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                    {filteredTournaments.filter((t) => t.status === "in_progress").length}
                  </Badge>
                </span>
              </TabsTrigger>
              <TabsTrigger value="UPCOMING">
                <span className="flex items-center">
                  {safeTranslate('upcoming', 'Upcoming')}
                  <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                    {filteredTournaments.filter((t) => t.status === "UPCOMING").length}
                  </Badge>
                </span>
              </TabsTrigger>
              <TabsTrigger value="COMPLETED">
                <span className="flex items-center">
                  {safeTranslate('finished', 'Finished')}
                  <Badge variant="outline" className="ml-2 bg-primary/20 text-primary">
                    {filteredTournaments.filter((t) => t.status === "COMPLETED").length}
                  </Badge>
                </span>
              </TabsTrigger>
              <TabsTrigger value="my-tournaments">{safeTranslate('my_tournaments', 'My Tournaments')}</TabsTrigger>
            </TabsList>
            <div className="hidden md:block">
              <SyncStatus status="live" />
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments.map((tournament, index) => (
                <TournamentCard key={tournament.id} tournament={tournament} index={index} />
              ))}
              {filteredTournaments.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {safeTranslate('no_tournaments_match_criteria', 'No tournaments match your search criteria')}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="in_progress" className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments
                .filter((t) => t.status === "in_progress")
                .map((tournament, index) => (
                  <TournamentCard key={tournament.id} tournament={tournament} index={index} />
                ))}
              {filteredTournaments.filter((t) => t.status === "in_progress").length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {safeTranslate('no_ongoing_tournaments_match_criteria', 'No ongoing tournaments match your search criteria')}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="UPCOMING" className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments
                .filter((t) => t.status === "UPCOMING")
                .map((tournament, index) => (
                  <TournamentCard key={tournament.id} tournament={tournament} index={index} />
                ))}
              {filteredTournaments.filter((t) => t.status === "UPCOMING").length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {safeTranslate('no_upcoming_tournaments_match_criteria', 'No upcoming tournaments match your search criteria')}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="COMPLETED" className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments
                .filter((t) => t.status === "COMPLETED")
                .map((tournament, index) => (
                  <TournamentCard key={tournament.id} tournament={tournament} index={index} />
                ))}
              {filteredTournaments.filter((t) => t.status === "COMPLETED").length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {safeTranslate('no_completed_tournaments_match_criteria', 'No completed tournaments match your search criteria')}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-tournaments" className="mt-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments
                .filter((t) => t.registered)
                .map((tournament, index) => (
                  <TournamentCard key={tournament.id} tournament={tournament} index={index} />
                ))}
              {filteredTournaments.filter((t) => t.registered).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {safeTranslate('no_registered_tournaments_criteria', 'You are not registered for any tournaments')}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
} 