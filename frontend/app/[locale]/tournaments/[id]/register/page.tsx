"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, Loader2, Search, ArrowRight, AlertCircle, CheckCircle2, MessageSquare, Share2, ImageIcon, Users, Calendar, Trophy, Globe, Lock, ShieldCheck, DollarSign, Crown, UserPlus } from "lucide-react"
import { useTranslations } from 'next-intl'
import { format } from "date-fns"
import Image from "next/image"
import { toPng } from "html-to-image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TournamentService } from '@/app/services/TournamentService'
import { RiotApiService } from '@/app/services/RiotApiService'
import { ParticipantService } from '@/app/services/ParticipantService'
import { ITournament } from '@/app/types/tournament'
import { GLOBAL_REGIONS, getMajorRegion } from "@/app/config/regions"
import { SubRegionSelector } from "@/components/ui/SubRegionSelector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUserStore } from "@/app/stores/userStore"

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
  const { toast } = useToast()
  const [tournament, setTournament] = useState<ITournament | null>(null)
  const [summonerName, setSummonerName] = useState("")
  const [gameTag, setGameTag] = useState("")
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [tournamentError, setTournamentError] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [discordId, setDiscordId] = useState("")
  const [referralSource, setReferralSource] = useState("")
  const [origin, setOrigin] = useState("")
  const [joinAsReserve, setJoinAsReserve] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin)
  }, [])
  const { currentUser } = useUserStore()
  const [summonerInfo, setSummonerInfo] = useState<{
    name: string
    iconId: number
    level: number
    rank: string
    puuid: string
  } | null>(null)

  useEffect(() => {
    if (currentUser?.riotGameName) {
      setSummonerName(currentUser.riotGameName || "")
      if (currentUser?.riotGameTag) {
        setGameTag(currentUser.riotGameTag)
      }
      // Mock summoner info based on current user since they already linked it
      setSummonerInfo({
        name: currentUser.riotGameName,
        iconId: 0,
        level: currentUser.level || 30,
        rank: "Unranked",
        puuid: currentUser.puuid || "linked-puuid",
      })
    }
    if (currentUser?.discordId) {
      setDiscordId(currentUser.discordId)
    }
  }, [currentUser])

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoadingTournament(true)
        const data = await TournamentService.detail(params.id)
        setTournament(data)
      } catch {
        setTournamentError("Error loading tournament details")
      } finally {
        setLoadingTournament(false)
      }
    }
    fetchTournament()
  }, [params.id])


  const [region, setRegion] = useState("VN2")

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
    } catch {
      setStatus("error")
      setErrorMessage("Summoner not found. Please check the name, tag, and region.")
      setSummonerInfo(null)
    }
  }

  const handleSubmit = async () => {
    if (!summonerInfo || !tournament || !discordId.trim()) {
      setErrorMessage("Please enter your Discord ID before registering.")
      return
    }

    setStatus("loading")
    setErrorMessage("")

    try {
      const result = await ParticipantService.join(tournament.id, discordId.trim(), referralSource, joinAsReserve)

      console.log('[REGISTER DEBUG] join result:', JSON.stringify(result))

      if (result.requiresPayment && result.checkoutUrl) {
        // Paid tournament — redirect to payment gateway (Stripe / MoMo)
        toast({
          title: "Redirecting to payment...",
          description: `Your slot is reserved. Complete payment to confirm registration.`,
        })
        window.location.href = result.checkoutUrl
      } else {
        // Free tournament — registration complete
        setStatus("success")
        toast({
          title: "Registration Successful!",
          description: "You have successfully registered for the tournament.",
        })
        window.location.href = `/tournaments/${params.id}`
      }
    } catch (err: any) {
      setStatus("error")
      setErrorMessage(err?.message || "An error occurred during registration. Please try again.")
      toast({
        title: "Registration Failed",
        description: err?.message || "Please check your eligibility or contact support.",
        variant: "destructive"
      })
    }
  }

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href.replace('/register', ''))
    toast({
      title: "Link Copied!",
      description: "Tournament link has been copied to your clipboard.",
    })
  }

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleOpenPreview = async () => {
    setIsGenerating(true)
    setTimeout(async () => {
      const element = document.getElementById('printable-area');
      if (element) {
        try {
          const width = element.scrollWidth;
          const height = element.scrollHeight;
          const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
          const dataUrl = await toPng(element, {
            cacheBust: true,
            backgroundColor: isDark ? '#09090b' : '#ffffff',
            filter: (node) => node.id !== 'preview-button-container',
            pixelRatio: 2,
            width: width,
            height: height,
            style: {
              width: `${width}px`,
              height: `${height}px`,
              transform: 'scale(1)',
              transformOrigin: 'top left',
              margin: '0',
              padding: '0'
            }
          });
          setPreviewImage(dataUrl);
          setIsPreviewOpen(true);
        } catch (err: any) {
          console.error("Poster generation error:", err);
          toast({ title: "Error", description: `Generation failed: ${err.message || 'Unknown error'}`, variant: "destructive" });
        }
      }
      setIsGenerating(false)
    }, 100)
  }

  const handleDownloadFromPreview = () => {
    if (previewImage) {
      const link = document.createElement('a');
      link.download = `${tournament?.name || 'tournament'}-register.png`;
      link.href = previewImage;
      link.click();
      toast({ title: "Success", description: "Image downloaded to your device!" });
    }
  }


  if (loadingTournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <Loader2 className="mr-2 h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">{t("loading_tournament_details")}</p>
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
        <p className="mt-4 text-lg">{t("tournament_not_found")}</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-xl border-border bg-background">
          <DialogHeader>
            <DialogTitle>Preview Poster</DialogTitle>
            <DialogDescription>
              Share this beautiful poster to invite friends to the tournament!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-2 min-h-[300px]">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating high-quality poster...</p>
              </div>
            ) : previewImage ? (
              <div className="relative w-full max-h-[60vh] overflow-y-auto rounded-lg shadow-lg">
                <img src={previewImage} alt="Preview" className="w-full h-auto" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Couldn't generate preview.</p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1 shrink-0 transition-all font-semibold" onClick={handleShareLink}>
              <Share2 className="mr-2 h-4 w-4" /> Share Link
            </Button>
            <Button className="flex-1 shrink-0 transition-all font-semibold shadow-md" onClick={handleDownloadFromPreview} disabled={!previewImage}>
              <ImageIcon className="mr-2 h-4 w-4" /> Download Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/tournaments">{t("tournaments")}</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/tournaments/${params.id}`}>{tournament.name}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{t("register")}</span>
      </div>

      <div id="printable-area" className="max-w-5xl mx-auto space-y-8 pb-12 animate-fade-in px-4 py-6 sm:px-6 rounded-xl bg-gradient-to-br from-background via-muted to-background dark:from-[#181433] dark:via-[#09090b] dark:to-[#09090b]">
        {/* Right Column: Registration Form */}
        <Card className="overflow-hidden bg-card border border-border shadow-2xl">
          <div className="relative h-64 sm:h-80 w-full block">
            <Image
              src={tournament.image?.trim() ? tournament.image : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
              alt={tournament.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Top Left: TesTicTour Escrow Badge */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              {tournament.isCommunityMode ? (
                <Badge variant="outline" className="bg-orange-600 text-white border-none font-mono tracking-wider px-2 py-1 uppercase text-xs shadow-lg shadow-orange-500/20">UNSECURED</Badge>
              ) : (
                <div className="flex items-center bg-[#064e3b]/90 backdrop-blur-sm border border-[#10b981]/50 rounded-lg shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2">
                    <div className="flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full p-1 shadow-inner shadow-white/20">
                      <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-white drop-shadow-md" />
                    </div>
                    <div className="flex flex-col pr-1">
                      <span className="text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">
                        {tournament.organizer?.partnerSubscription?.plan === 'PRO' || tournament.organizer?.partnerSubscription?.plan === 'ENTERPRISE' ? "Verified Host" : "TesTicTour"}
                      </span>
                      <span className="text-emerald-400 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider leading-none">
                        {tournament.organizer?.partnerSubscription?.plan === 'PRO' || tournament.organizer?.partnerSubscription?.plan === 'ENTERPRISE' ? "Trusted Partner" : "Escrow Guarantee"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-emerald-950/60 self-stretch flex items-center px-2 sm:px-3 border-l border-emerald-500/30">
                    {["funded", "locked", "released", "payout_released"].includes(tournament.escrowStatus || "") ? (
                      <span className="text-emerald-400 font-black font-mono tracking-wider uppercase text-[10px] sm:text-[11px] drop-shadow-md">100% FUNDED</span>
                    ) : (
                      <span className="text-yellow-500 font-black font-mono tracking-wider uppercase text-[10px] sm:text-[11px] drop-shadow-md">PENDING</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <Badge className="mb-3 bg-primary text-primary-foreground px-3 py-1 text-sm border-none shadow-md">{tournament.status.replace('_', ' ')}</Badge>
              <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight break-words text-white drop-shadow-lg tracking-tight">{tournament.name}</h1>

              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-zinc-100 font-medium">
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  {tournament.organizer?.username && tournament.organizer.username.toLowerCase() !== 'admin' ? (
                    <>
                      <Crown className="h-4 w-4 text-pink-400" />
                      <span>By <span className="font-bold text-pink-400">{tournament.organizer.username}</span></span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>By <span className="font-bold text-emerald-400">TesTicTour</span></span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span>{tournament.maxPlayers} Max</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  <span>{tournament.region || t("n_a")}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  <Calendar className="h-4 w-4 text-violet-400" />
                  <span>{tournament.startTime && !isNaN(new Date(tournament.startTime).getTime()) ? format(new Date(tournament.startTime), "PPp") : t("n_a")}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 font-bold">{tournament.entryFee.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#18181b]/95 px-2.5 py-1 rounded-md border border-[#3f3f46] shadow-sm">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">
                    {(tournament.budget && tournament.budget > 0)
                      ? `${tournament.budget.toLocaleString()} `
                      : t("tbd_prize_pool") || "TBD Prize Pool"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="bg-background p-4 flex gap-3 border-t border-border" id="preview-button-container">
            <Button className="w-full shrink-0 transition-all font-bold shadow-sm" onClick={handleOpenPreview} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
              {isGenerating ? "Generating..." : "Preview & Share Poster"}
            </Button>
          </CardContent>
        </Card>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto space-y-6">


          {tournament.isCommunityMode && (
            <Alert className="mb-6 border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-sm shadow-orange-500/10">
              <AlertCircle className="h-5 w-5 !text-orange-500" />
              <AlertTitle className="text-orange-500 font-bold tracking-wide uppercase text-sm">{t("community_mode")}</AlertTitle>
              <AlertDescription className="mt-1 opacity-90">{t("the_entry_fee_and_prize_pool_for_this_to_desc")}<strong>{t("not_secured_by_escrow")}</strong>{t("by_registering_you_acknowledge_that_payo_desc")}</AlertDescription>
            </Alert>
          )}




          <Card className="bg-card border-t-8 border-t-[#673AB7] shadow-xl border-x-border border-b-border rounded-xl">
            <CardHeader className="px-6 py-6 pb-2">
              <CardTitle className="text-2xl sm:text-3xl">{t("player_information")}</CardTitle>
              <CardDescription className="text-base">{t("we_will_use_your_riot_account_to_track_y_desc")}</CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="summoner-name" className="text-base font-semibold">{t("summoner_name")} <span className="text-red-500">*</span></Label>
                    <div className="flex space-x-2 w-full">
                      <Input id="summoner-name" value={summonerName || t("no_riot_account_linked")} readOnly className="flex-1 bg-muted" />
                      <Input id="game-tag" value={gameTag} readOnly placeholder="#TAG" className="w-24 bg-muted" />
                    </div>
                    {!currentUser?.riotGameName && (
                      <p className="text-sm text-red-500 mt-1">You need to link your Riot account in your profile before registering.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="region-select" className="text-base font-semibold">{t("region")} <span className="text-red-500">*</span></Label>
                    <div className="w-full">
                      <SubRegionSelector id="region-select" value={region} onChange={setRegion} />
                    </div>
                  </div>

                  <Alert className="bg-red-500/10 border-red-500/30 text-red-500 shadow-sm shadow-red-500/10 py-3">
                    <AlertCircle className="h-4 w-4 !text-red-500" />
                    <AlertTitle className="font-bold text-sm tracking-wide ml-2 uppercase">{t("warning_title")}</AlertTitle>
                    <AlertDescription className="text-xs opacity-90 mt-1 ml-2">
                       {t("absent_warning_desc")}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Label htmlFor="discord-id" className="text-base font-semibold block">
                      {t("discord_id")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2 w-full">
                      <Input id="discord-id" value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="Ex: username#1234 or username" className="bg-card w-full" required />
                      {tournament.discordUrl ? (
                        <Button asChild className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 shrink-0">
                          <a href={tournament.discordUrl} target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">Join Server</span><span className="sm:hidden">Join</span>
                          </a>
                        </Button>
                      ) : (
                        <Button disabled variant="outline" className="px-3 shrink-0 text-muted-foreground">
                          <MessageSquare className="w-4 h-4 mr-1.5" /> <span className="hidden sm:inline">No Server</span><span className="sm:hidden">None</span>
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">We need your Discord ID to contact you for match updates and prizes.</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold block text-primary">How did you hear about this tournament?</Label>
                    <RadioGroup value={referralSource} onValueChange={setReferralSource} className="space-y-2 mt-2">
                      <div className="flex items-center space-x-3"><RadioGroupItem value="facebook" id="r1" /><Label htmlFor="r1" className="cursor-pointer text-sm">Facebook Group / Page</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="discord" id="r2" /><Label htmlFor="r2" className="cursor-pointer text-sm">Discord Server</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="friend" id="r3" /><Label htmlFor="r3" className="cursor-pointer text-sm">Friends / Word of Mouth</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="other" id="r4" /><Label htmlFor="r4" className="cursor-pointer text-sm">Other</Label></div>
                    </RadioGroup>
                  </div>

                  <div className="mt-4">
                    {tournament.isCommunityMode ? (
                      <Alert className="bg-orange-500/10 border-orange-500/30 text-orange-500 shadow-sm shadow-orange-500/10 py-3">
                        <AlertCircle className="h-5 w-5 !text-orange-500" />
                        <AlertTitle className="font-bold text-sm tracking-wide">Community Mode</AlertTitle>
                        <AlertDescription className="text-xs opacity-90 mt-1">This tournament's prize pool is not secured by Escrow.</AlertDescription>
                      </Alert>
                    ) : ["funded", "locked", "released", "payout_released"].includes(tournament.escrowStatus || "") ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 relative overflow-hidden shadow-sm">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="bg-emerald-500/20 p-2 rounded-full hidden sm:block">
                            <ShieldCheck className="h-5 w-5 text-emerald-500 drop-shadow-md" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-widest leading-none mb-1">Escrow Secured</h3>
                            <p className="text-[11px] text-emerald-300/80 leading-tight m-0 pr-2">Guaranteed by TesTicTour.</p>
                          </div>
                          <div className="border-l border-emerald-500/20 pl-3 py-1 flex flex-col items-start gap-1.5 shrink-0">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-500/80 font-bold leading-none">Sponsored By</span>
                            <div className="flex items-center gap-2">
                              <div className="bg-emerald-900/40 border border-emerald-500/30 rounded px-1.5 py-0.5 flex items-center gap-1">
                                {tournament.organizer?.username && tournament.organizer.username.toLowerCase() !== 'admin' ? (
                                  <>
                                    <Crown className="w-2.5 h-2.5 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-100">{tournament.organizer.username}</span>
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-100">TesTicTour</span>
                                  </>
                                )}
                              </div>
                              {(!tournament.sponsors || tournament.sponsors.length === 0) ? (
                                <>
                                  <img src="/vng.png" alt="VNG" className="h-[14px] w-auto object-contain brightness-0 invert opacity-90" />
                                  <img src="/riot.svg" alt="Riot" className="h-[15px] w-auto object-contain brightness-0 invert opacity-90" />
                                </>
                              ) : (
                                tournament.sponsors.slice(0, 3).map((sponsor: any, idx: number) => (
                                  <img key={idx} src={sponsor.url} alt={sponsor.name} className="h-[15px] w-auto object-contain brightness-0 invert opacity-90" crossOrigin="anonymous" />
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-sm shadow-yellow-500/10 py-3">
                        <AlertCircle className="h-5 w-5 !text-yellow-500" />
                        <div className="ml-2">
                          <AlertTitle className="font-bold text-sm tracking-wide">Pending Escrow</AlertTitle>
                          <AlertDescription className="text-xs opacity-90 mt-1">Prize pool has not been funded yet.</AlertDescription>
                        </div>
                      </Alert>
                    )}
                  </div>

                  {/* Entry fee payment info */}
                  {tournament.entryFee > 0 && (
                    <div className="mt-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">Entry Fee Required</span>
                      </div>
                      <p className="text-xs text-amber-300/80">
                        This tournament requires an entry fee of{" "}
                        <strong className="text-amber-300">
                          ${tournament.entryFee.toLocaleString()} USD
                        </strong>.
                        After clicking Register, you will be redirected to the payment gateway to complete your registration.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Your slot is reserved until payment is completed.</span>
                      </div>
                    </div>
                  )}

                  {/* Reserve Player Toggle */}
              {tournament && (tournament.reservePlayersLimit || 0) > 0 && (tournament.registered || 0) >= tournament.maxPlayers && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wide">Main Slots Full — Join as Reserve?</span>
                  </div>
                  <p className="text-xs text-amber-300/80">
                    All {tournament.maxPlayers} main slots are taken. You can join as a <strong className="text-amber-300">reserve player (dự bị)</strong>.
                    If a spot opens up, you'll be notified via email and assigned to a lobby by the admin.
                    Your entry fee will be <strong>automatically refunded</strong> if you are not assigned.
                  </p>
                  <Button
                    type="button"
                    variant={joinAsReserve ? "default" : "outline"}
                    className={joinAsReserve ? "bg-amber-600 hover:bg-amber-700 w-full" : "border-amber-500/50 text-amber-400 w-full"}
                    onClick={() => setJoinAsReserve(!joinAsReserve)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {joinAsReserve ? '✓ You will join as Reserve' : 'Click to Join as Reserve'}
                  </Button>
                </div>
              )}

              {status === "error" && (
                    <Alert variant="destructive" className="animate-fade-in py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm">{t("error")}</AlertTitle>
                      <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                    </Alert>
                  )}

                  {summonerInfo && (
                    <Alert className="bg-primary/10 border-primary/20 text-primary animate-fade-in py-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle className="text-sm">{t("summoner_found")}</AlertTitle>
                      <AlertDescription className="flex flex-col gap-1 text-xs mt-1">
                        <div><span className="font-medium">{summonerInfo.name}</span> (Level {summonerInfo.level})</div>
                        <div>Rank: {summonerInfo.rank}</div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

            </CardContent>
            <CardFooter className="flex justify-between bg-muted/20 border-t border-border px-6 py-4 rounded-b-xl">
              <Button variant="outline" size="lg" asChild>
                <Link href={`/tournaments/${params.id}`}>{t("cancel")}</Link>
              </Button>
              <Button size="lg" onClick={handleSubmit} disabled={
                !currentUser?.riotGameName || !discordId.trim() || status === "loading" || 
                ((tournament.registered || 0) >= tournament.maxPlayers && !joinAsReserve && (tournament.reservePlayersLimit || 0) > 0)
              }>
                {status === "loading" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tournament.entryFee > 0 ? "Reserving slot..." : t("registering")}</>
                ) : tournament.entryFee > 0 ? (
                  <><DollarSign className="mr-2 h-4 w-4" />Register & Pay ${tournament.entryFee} USD<ArrowRight className="ml-2 h-4 w-4" /></>
                ) : (
                  <>{t("register")}<ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
