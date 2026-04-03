"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Loader2, Search, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { useTranslations } from 'next-intl'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TournamentService } from '@/app/services/TournamentService'
import { RiotApiService } from '@/app/services/RiotApiService'
import { ParticipantService } from '@/app/services/ParticipantService'
import { ITournament } from '@/app/types/tournament'


// Mock regions
// const regions = [
//   { id: "ap", name: "Asia Pacific (AP)" },
//   { id: "na", name: "North America (NA)" },
//   { id: "euw", name: "Europe West (EUW)" },
//   { id: "kr", name: "Korea (KR)" },
//   { id: "br", name: "Brazil (BR)" },
//   { id: "lan", name: "Latin America North (LAN)" },
//   { id: "las", name: "Latin America South (LAS)" },
//   { id: "oce", name: "Oceania (OCE)" },
// ]

export default function TournamentRegistration({ params }: { params: { id: string } }) {
  const t = useTranslations('common')
  const [tournament, setTournament] = useState<ITournament | null>(null)
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [tournamentError, setTournamentError] = useState<string | null>(null)
  const [summonerName, setSummonerName] = useState("")
  const [gameTag, setGameTag] = useState("")
  const [region, setRegion] = useState("AP") // Default to AP
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [summonerInfo, setSummonerInfo] = useState<{
    name: string
    iconId: number
    level: number
    rank: string
    puuid: string
  } | null>(null)

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoadingTournament(true)
        const data = await TournamentService.detail(params.id)
        setTournament(data)
      } catch  {
        setTournamentError("Error loading tournament details")
      } finally {
        setLoadingTournament(false)
      }
    }
    fetchTournament()
  }, [params.id])

  const handleSearch = async () => {
    if (!summonerName.trim() || !gameTag.trim() || !region) return

    setStatus("loading")
    setErrorMessage("")
    setSummonerInfo(null)

    try {
      const puuid = await RiotApiService.getSummonerPuuid(summonerName, gameTag, region)
      // In a real application, you would also fetch summoner details (icon, level, rank) using the PUUID
      // For now, we'll just mock it or assume we get it back with the PUUID
      setSummonerInfo({
        name: summonerName,
        iconId: 0, // Placeholder
        level: 0, // Placeholder
        rank: "", // Placeholder
        puuid: puuid,
      })
      setStatus("success")
    } catch  {
      setStatus("error")
      setErrorMessage("Summoner not found. Please check the name, tag, and region.")
      setSummonerInfo(null)
    }
  }

  const handleSubmit = async () => {
    if (!summonerInfo || !tournament) return

    setStatus("loading")
    setErrorMessage("")

    try {
      await ParticipantService.join(tournament.id) // Assuming `join` only needs tournamentId
      setStatus("success")
      window.location.href = `/tournaments/${params.id}`
    } catch  {
      setStatus("error")
      setErrorMessage( "An error occurred during registration.")
    }
  }

  if (loadingTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <Loader2 className="mr-2 h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading tournament details...</p>
      </div>
    )
  }

  if (tournamentError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12 text-red-500">
        <AlertCircle className="mr-2 h-16 w-16" />
        <p className="mt-4 text-lg">Error loading tournament: {tournamentError}</p>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12 text-red-500">
        <AlertCircle className="mr-2 h-16 w-16" />
        <p className="mt-4 text-lg">Tournament not found.</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/tournaments">Tournaments</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/tournaments/${params.id}`}>{tournament.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Register</span>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Register for {tournament.name}</h1>
        <p className="text-muted-foreground mb-8">
          Enter your Summoner Name and Game Tag, and select your region to register for this tournament. Registration fee:{" "}
          {tournament.entryFee}
        </p>

        <Card className="animate-fade-in bg-card/60 dark:bg-card/40 backdrop-blur-lg border border-white/20">
          <CardHeader>
            <CardTitle>Player Information</CardTitle>
            <CardDescription>
              We will use your Riot account to track your tournament progress automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="summoner-name">{t("summoner_name")}</Label>
              <div className="flex space-x-2">
                <Input
                  id="summoner-name"
                  value={summonerName}
                  onChange={(e) => setSummonerName(e.target.value)}
                  placeholder="Enter your summoner name"
                  className="flex-1"
                  disabled={status === "loading" || status === "success"}
                />
                <Input
                  id="game-tag"
                  value={gameTag}
                  onChange={(e) => setGameTag(e.target.value)}
                  placeholder="#TAG"
                  className="w-24"
                  disabled={status === "loading" || status === "success"}
                />
                <Button
                  onClick={handleSearch}
                  disabled={!summonerName.trim() || !gameTag.trim() || status === "loading" || status === "success"}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">{t("region")}</Label>
              <RadioGroup
                defaultValue={region}
                onValueChange={setRegion}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                disabled={status === "loading" || status === "success"}
              >
                {[
                  { id: "AP", name: "Asia Pacific (AP)" },
                  { id: "NA", name: "North America (NA)" },
                  { id: "EUW", name: "Europe West (EUW)" },
                  { id: "KR", name: "Korea (KR)" },
                  { id: "BR", name: "Brazil (BR)" },
                  { id: "LAN", name: "Latin America North (LAN)" },
                  { id: "LAS", name: "Latin America South (LAS)" },
                  { id: "OCE", name: "Oceania (OCE)" },
                ].map((regionOption) => (
                  <div key={regionOption.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={regionOption.id} id={regionOption.id} />
                    <Label htmlFor={regionOption.id} className="cursor-pointer">
                      {regionOption.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {status === "error" && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {summonerInfo && (
              <Alert className="bg-primary/10 border-primary/20 text-primary animate-fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Summoner Found</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <div>
                    <span className="font-medium">{summonerInfo.name}</span> (Level {summonerInfo.level})
                  </div>
                  <div>Rank: {summonerInfo.rank}</div>
                  <div className="text-xs text-muted-foreground">PUUID: {summonerInfo.puuid}</div>
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border p-4 bg-muted/50 border-white/20">
              <h3 className="font-medium mb-2">Registration Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tournament:</span>
                  <span>{tournament.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration Fee:</span>
                  <span>{tournament.entryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span>Credit Card / PayPal (Payment integration not yet available)</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href={`/tournaments/${params.id}`}>Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={!summonerInfo || status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Register
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
