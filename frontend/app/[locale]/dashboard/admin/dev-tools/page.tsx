"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap, AlertCircle, FlaskConical, Database, FileDigit, PlaySquare, Bot, Key, ExternalLink } from "lucide-react";
import { useMiniTourLobbyStore } from "@/app/stores/miniTourLobbyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCompPanel } from "@/components/match/MatchCompPanel";
import { GrimoireMatchData } from "@/app/types/riot";
import api from "@/app/lib/apiConfig";

const REGIONS = ["sea", "asia", "europe", "americas"];

export default function DevToolsPage() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("sea");
  const [matchCount, setMatchCount] = useState("4");
  
  const [loading1, setLoading1] = useState(false);
  const [matchData, setMatchData] = useState<GrimoireMatchData | null>(null);
  const [error1, setError1] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);

  const [loading2, setLoading2] = useState(false);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [error2, setError2] = useState<string | null>(null);

  // Automation states
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [seededTournamentId, setSeededTournamentId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState("");
  const [userId, setUserId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [lobbyType, setLobbyType] = useState("minitour");

  // Riot ID used as match source for simulate-match endpoint
  const [simGameName, setSimGameName] = useState("");
  const [simTagLine, setSimTagLine] = useState("");
  const [simGameName2, setSimGameName2] = useState("");
  const [simTagLine2, setSimTagLine2] = useState("");
  const [simGameName3, setSimGameName3] = useState("");
  const [simTagLine3, setSimTagLine3] = useState("");
  const [simGameName4, setSimGameName4] = useState("");
  const [simTagLine4, setSimTagLine4] = useState("");
  const [simRegion, setSimRegion] = useState("sea");
  const [simTourPlayers, setSimTourPlayers] = useState("16"); // Default 16 players (2 groups)

  // Get the store's fetchLobby so we can trigger real-time refresh on lobby detail pages
  const { fetchLobby: refreshLobbyStore } = useMiniTourLobbyStore();

  // Endpoints that mutate lobby state and should trigger a store refresh
  const STATE_CHANGING_ENDPOINTS = ['auto-start', 'simulate-match', 'seed-env', 'ready-toggle'];

  async function handleAutomation(endpoint: string, payload: any) {
    setAutomationLoading(true);
    setAutomationError(null);
    setAutomationResult(null);
    try {
      const res = await api.post(`/dev/automation/${endpoint}`, payload);
      if (res.data.success) {
        setAutomationResult(res.data);

        // Track tournament ID across steps so we can show persistent nav link
        if (res.data.tournamentId) {
          setSeededTournamentId(res.data.tournamentId);
        }

        // Auto-refresh the lobby in zustand store so lobby detail pages update in real-time
        if (STATE_CHANGING_ENDPOINTS.includes(endpoint) && res.data.lobbyId) {
          try {
            await refreshLobbyStore(res.data.lobbyId);
          } catch (e) {
            console.warn('[DevTools] Could not auto-refresh lobby store:', e);
          }
        }
      } else {
        setAutomationError(res.data.error || "Action failed");
      }
    } catch (e: any) {
      setAutomationError(e.response?.data?.error ?? e.message);
    } finally {
      setAutomationLoading(false);
    }
  }

  async function fetchSingleMatch() {
    setLoading1(true);
    setError1(null);
    setMatchData(null);
    try {
      const body: Record<string, string> = { region };
      if (gameName) body.gameName = gameName;
      if (tagLine) body.tagLine = tagLine;

      const res = await api.post("/dev/test-riot-match", body);
      if (res.data.success && res.data.match) {
        setMatchData(res.data.match);
      } else {
        setError1(res.data.error || "No match found");
      }
    } catch (e: any) {
      setError1(e.response?.data?.error ?? e.message);
    } finally {
      setLoading1(false);
    }
  }

  async function seedFullTournament() {
    setLoading2(true);
    setError2(null);
    setSeedResult(null);
    try {
      const body: Record<string, any> = { region, matchCount: parseInt(matchCount) };
      if (gameName) body.gameName = gameName;
      if (tagLine) body.tagLine = tagLine;

      const res = await api.post("/dev/seed-full-tournament", body);
      if (res.data.success) {
        setSeedResult(res.data);
      } else {
        setError2(res.data.error || "Seeding failed");
      }
    } catch (e: any) {
      setError2(e.response?.data?.error ?? e.message);
    } finally {
      setLoading2(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
          <Database className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dev Tools</h1>
          <p className="text-sm text-muted-foreground">Test integrations and seed mock data</p>
        </div>
      </div>

      {/* ⚠️ DEV-ONLY banner */}
      <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold">Development Environment Only</p>
          <p className="text-red-400/80 leading-relaxed">
            All actions on this page <strong>mutate real database records</strong> and are intended only for local/staging testing.
            <strong> Never run these in production.</strong>{' '}
            For production incidents (e.g. stuck lobbies), use the{' '}
            <span className="underline underline-offset-2 cursor-default">Round Control</span> tab inside{' '}
            <strong>Admin → Tournaments → [Tournament] → Round Control</strong>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" /> Single Match Test
          </TabsTrigger>
          <TabsTrigger value="full" className="flex items-center gap-2">
            <PlaySquare className="h-4 w-4" /> Seed Full Tournament
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bot className="h-4 w-4" /> Automation Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fetch Single Match</CardTitle>
              <CardDescription>
                Fetches ONE real match from Grimoire API and shows the MatchCompPanel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <Label>Game Name</Label>
                  <Input placeholder="e.g. Faker" value={gameName} onChange={e => setGameName(e.target.value)} className="bg-black/30 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tag Line</Label>
                  <Input placeholder="e.g. KR1" value={tagLine} onChange={e => setTagLine(e.target.value)} className="bg-black/30 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={fetchSingleMatch} disabled={loading1} className="bg-primary hover:bg-primary/90 gap-2">
                  {loading1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading1 ? "Fetching..." : "Fetch Match"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error1 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error1}</p>
              </div>
            </div>
          )}

          {matchData && (
            <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">✅ Match Retrieved</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{matchData.matchId}</Badge>
                    <Badge variant="secondary">Set {matchData.tftSetNumber}</Badge>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setRaw(r => !r)}>
                      {raw ? "Show UI" : "Show Raw JSON"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {raw ? (
                  <pre className="text-[10px] bg-black/40 rounded-lg p-4 overflow-auto max-h-[60vh] border border-white/5">
                    {JSON.stringify(matchData, null, 2)}
                  </pre>
                ) : (
                  <MatchCompPanel matchData={matchData} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="full" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base line-clamp-1">Seed Full Tournament</CardTitle>
                <CardDescription>
                  Clears old generic match data and re-seeds multiple historical matches for exhaustive real statistics generation in Admin Dashboard.
                </CardDescription>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 shrink-0 border-none px-3 py-1 font-semibold uppercase tracking-wider">
                Destructive Action
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5 lg:col-span-1">
                  <Label>Game Name</Label>
                  <Input placeholder="e.g. Faker" value={gameName} onChange={e => setGameName(e.target.value)} className="bg-black/30 border-white/10" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <Label>Tag Line</Label>
                  <Input placeholder="e.g. KR1" value={tagLine} onChange={e => setTagLine(e.target.value)} className="bg-black/30 border-white/10" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <Label>Region</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <Label>Matches (Max 4)</Label>
                  <Select value={matchCount} onValueChange={setMatchCount}>
                    <SelectTrigger className="bg-black/30 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Match</SelectItem>
                      <SelectItem value="2">2 Matches</SelectItem>
                      <SelectItem value="3">3 Matches</SelectItem>
                      <SelectItem value="4">4 Matches</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={seedFullTournament} disabled={loading2} className="bg-orange-600 hover:bg-orange-700 gap-2 lg:col-span-1">
                  {loading2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {loading2 ? "Seeding..." : "Seed Database"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {error2 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error2}</p>
              </div>
            </div>
          )}

          {seedResult && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-400">
              <FileDigit className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Successfully Seeded Tournament: {seedResult.tournamentId}</p>
                <ul className="list-disc list-inside mt-2 text-sm opacity-90 space-y-1">
                  <li>Fetched {seedResult.matchesFetched} unique matches from Grimoire API</li>
                  <li>Injected data into {seedResult.matchesSeeded} individual matches within the tournament phases</li>
                  <li>Populated user data and updated participant scores</li>
                </ul>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="automation" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col gap-4 p-4 bg-background/40 border border-white/10 rounded-xl">
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground mr-2">Quick Setup</h3>
                <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 h-8" onClick={() => handleAutomation('clear-env', {})}>
                  🗑 Clear All Data
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Flow:</Label>
                <Select value={lobbyType} onValueChange={setLobbyType}>
                  <SelectTrigger className="w-[140px] h-8 bg-black/30 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minitour">MiniTour</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
               <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">🎯 Target Tournament ID</Label>
                 <Input 
                   placeholder="Auto-detect latest if empty" 
                   value={seededTournamentId || ""} 
                   onChange={e => setSeededTournamentId(e.target.value)} 
                   className="bg-black/30 border-white/10 h-8 text-xs font-mono" 
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">🎯 Target Round ID</Label>
                 <Input 
                   placeholder="Auto-detect latest if empty" 
                   value={roundId} 
                   onChange={e => setRoundId(e.target.value)} 
                   className="bg-black/30 border-white/10 h-8 text-xs font-mono" 
                 />
               </div>
               <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground">🎯 Target Lobby ID</Label>
                 <Input 
                   placeholder="Auto-detect latest if empty" 
                   value={lobbyId} 
                   onChange={e => setLobbyId(e.target.value)} 
                   className="bg-black/30 border-white/10 h-8 text-xs font-mono" 
                 />
               </div>
            </div>
          </div>

          {/* ── Riot Data Source ─────────────────────────────────────────────── */}
          <Card className="border-yellow-500/20 bg-yellow-500/5 backdrop-blur-lg">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                <Key className="w-4 h-4" /> Riot Data Source — Required for "Simulate Match"
              </CardTitle>
              <CardDescription className="text-xs">
                Enter a real TFT player's Riot ID. The simulate endpoint will fetch their latest match from Riot API via Grimoire.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 items-end">
                  {/* Player 1 & 2 */}
                  <div className="grid grid-cols-2 gap-3 border border-white/5 p-3 rounded-lg bg-black/20">
                    <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Player 1 (Primary)</div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Game Name</Label>
                      <Input placeholder="e.g. Faker" value={simGameName} onChange={e => setSimGameName(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tag Line</Label>
                      <Input placeholder="e.g. VN2" value={simTagLine} onChange={e => setSimTagLine(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border border-white/5 p-3 rounded-lg bg-black/20">
                    <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Player 2</div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Game Name</Label>
                      <Input placeholder="(Optional)" value={simGameName2} onChange={e => setSimGameName2(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tag Line</Label>
                      <Input placeholder="(Optional)" value={simTagLine2} onChange={e => setSimTagLine2(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                  </div>

                  {/* Player 3 & 4 */}
                  <div className="grid grid-cols-2 gap-3 border border-white/5 p-3 rounded-lg bg-black/20">
                    <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Player 3</div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Game Name</Label>
                      <Input placeholder="(Optional)" value={simGameName3} onChange={e => setSimGameName3(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tag Line</Label>
                      <Input placeholder="(Optional)" value={simTagLine3} onChange={e => setTagLine3(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border border-white/5 p-3 rounded-lg bg-black/20">
                    <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Player 4</div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Game Name</Label>
                      <Input placeholder="(Optional)" value={simGameName4} onChange={e => setSimGameName4(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tag Line</Label>
                      <Input placeholder="(Optional)" value={simTagLine4} onChange={e => setTagLine4(e.target.value)} className="bg-black/30 border-white/10 h-8 text-xs" />
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-3 justify-between">
                  <div className="space-y-1 w-1/4">
                    <Label className="text-xs text-muted-foreground">Region</Label>
                    <Select value={simRegion} onValueChange={setSimRegion}>
                      <SelectTrigger className="bg-black/30 border-white/10 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    {simGameName && simTagLine ? (
                      <div className="text-xs text-emerald-400 flex items-center gap-1.5 pb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        Provided players will be fetched in Region: {simRegion.toUpperCase()}
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-500/70 pb-1">⚠ No Player 1 set — will fail if DB has no valid PUUIDs</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              {lobbyType === 'minitour' ? (
                <Card className="border-emerald-500/20 bg-card/60 backdrop-blur-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> MiniTour Lifecycle
                    </CardTitle>
                    <CardDescription>Full MiniTour lobby lifecycle — seed → start → simulate → complete</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <Button size="sm" className="w-full justify-start border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" variant="outline"
                      onClick={() => handleAutomation('seed-env', {
                        type: 'minitour',
                        gameName: simGameName || undefined,
                        tagLine: simTagLine || undefined,
                        gameName2: simGameName2 || undefined,
                        tagLine2: simTagLine2 || undefined,
                        gameName3: simGameName3 || undefined,
                        tagLine3: simTagLine3 || undefined,
                        gameName4: simGameName4 || undefined,
                        tagLine4: simTagLine4 || undefined,
                        region: simRegion,
                      })}>
                      1. Seed Users + MiniTour Lobby (7/8)
                    </Button>
                    <Button size="sm" className="w-full justify-start border-white/20 bg-background/50 hover:bg-white/10" variant="outline"
                      onClick={() => handleAutomation('auto-start', { type: 'minitour', lobbyId: lobbyId || undefined })}>
                      2. Force Start (WAITING → IN_PROGRESS)
                    </Button>
                    <Button size="sm" className="w-full justify-start border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" variant="outline"
                      onClick={() => handleAutomation('simulate-match', {
                        type: 'minitour',
                        lobbyId: lobbyId || undefined,
                        gameName: simGameName || undefined,
                        tagLine: simTagLine || undefined,
                        region: simRegion,
                      })}>
                      3. Simulate Match Results (Riot Data)
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-purple-500/20 bg-card/60 backdrop-blur-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-purple-400 flex items-center gap-2">
                      <PlaySquare className="w-4 h-4" /> Tournament Lobby & Match
                    </CardTitle>
                    <CardDescription>Auto-targets the latest WAITING or IN_PROGRESS Tournament Lobby</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <Select value={simTourPlayers} onValueChange={setSimTourPlayers}>
                        <SelectTrigger className="w-[120px] bg-black/30 border-white/10 h-8 text-xs shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 Players</SelectItem>
                          <SelectItem value="16">16 Players</SelectItem>
                          <SelectItem value="24">24 Players</SelectItem>
                          <SelectItem value="32">32 Players</SelectItem>
                          <SelectItem value="64">64 Players</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="flex-1 justify-start border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" variant="outline" onClick={() => handleAutomation('seed-env', {
                        type: 'tournament',
                        gameName: simGameName || undefined,
                        tagLine: simTagLine || undefined,
                        gameName2: simGameName2 || undefined,
                        tagLine2: simTagLine2 || undefined,
                        gameName3: simGameName3 || undefined,
                        tagLine3: simTagLine3 || undefined,
                        gameName4: simGameName4 || undefined,
                        tagLine4: simTagLine4 || undefined,
                        region: simRegion,
                        numPlayers: parseInt(simTourPlayers)
                      })}>
                        1. Seed Tournament (Pending)
                      </Button>
                    </div>
                    <Button size="sm" className="w-full justify-start border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" variant="outline" onClick={() => handleAutomation('pre-assign-groups', { tournamentId: seededTournamentId })}>
                      2. Pre-assign Groups
                    </Button>
                    <Button size="sm" className="w-full justify-start border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20" variant="outline" onClick={() => handleAutomation('assign-lobby', { tournamentId: seededTournamentId, lobbyId })}>
                      3. Start Tournament
                    </Button>
                    <Button size="sm" className="w-full justify-start border-white/20 bg-background/50 hover:bg-white/10" variant="outline" onClick={() => handleAutomation('ready-toggle', { lobbyId })}>
                      4. Toggle Ready
                    </Button>
                    <Button size="sm" className="w-full justify-start border-pink-500/30 text-pink-400 bg-pink-500/10 hover:bg-pink-500/20" variant="outline" onClick={() => handleAutomation('advance-round', { roundId })}>
                      5. Auto Advance & Reshuffle
                    </Button>
                    <Button size="sm" className="w-full justify-start border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" variant="outline" onClick={() => handleAutomation('simulate-match', {
                      type: 'tournament',
                      gameName: simGameName || undefined,
                      tagLine: simTagLine || undefined,
                      region: simRegion,
                      lobbyId: lobbyId || undefined,
                    })}>
                      6. Simulate Match
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="border-white/10 bg-black/40 shadow-inner h-full flex flex-col min-h-[400px]">
              <CardHeader className="py-3 px-4 border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <Loader2 className={`w-3 h-3 ${automationLoading ? 'animate-spin opacity-100' : 'opacity-0'}`} />
                  Execution Result
                </CardTitle>
                <div className="flex items-center gap-2">
                  {seededTournamentId && (
                    <div className="flex items-center gap-1.5">
                      <Link href={`/dashboard/admin/tournaments/${seededTournamentId}`}>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-violet-500/40 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20">
                          <ExternalLink className="w-2.5 h-2.5" /> Admin Manage
                        </Button>
                      </Link>
                      <Link href={`/tournaments/${seededTournamentId}`} target="_blank">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1 border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20">
                          <ExternalLink className="w-2.5 h-2.5" /> View Tournament
                        </Button>
                      </Link>
                    </div>
                  )}
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    {lobbyType === 'minitour' ? 'MiniTour' : 'Tournament'} Mode
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-auto font-mono text-xs flex-1">
                {automationError ? (
                  <div className="text-red-400">{automationError}</div>
                ) : automationResult ? (
                  <pre className="text-emerald-400/90 whitespace-pre-wrap">{JSON.stringify(automationResult, null, 2)}</pre>
                ) : (
                  <div className="text-muted-foreground/30">Select an action to view the result payload here.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
