"use client";

import { useState } from "react";
import { Loader2, Zap, AlertCircle, FlaskConical, Database, FileDigit, PlaySquare, Bot, Key } from "lucide-react";
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
  const [lobbyId, setLobbyId] = useState("");
  const [userId, setUserId] = useState("");
  const [roundId, setRoundId] = useState("");
  const [lobbyType, setLobbyType] = useState("minitour");

  async function handleAutomation(endpoint: string, payload: any) {
    setAutomationLoading(true);
    setAutomationError(null);
    setAutomationResult(null);
    try {
      const res = await api.post(`/dev/automation/${endpoint}`, payload);
      if (res.data.success) {
        setAutomationResult(res.data);
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
          <div className="flex gap-4 items-center p-4 bg-background/40 border border-white/10 rounded-xl">
            <h3 className="text-sm font-semibold text-muted-foreground w-1/4">Quick Setting</h3>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20" onClick={() => handleAutomation('seed-env', {})}>
                1. Seed Test Environment
              </Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20" onClick={() => handleAutomation('clear-env', {})}>
                Clear All Data
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
              <CardHeader className="pb-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-base text-purple-400">Lobby & Match Tasks</CardTitle>
                  <CardDescription>Auto-targets the latest WAITING or IN_PROGRESS Lobby</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex flex-col gap-3">
                  <Button size="sm" className="w-full justify-start border-white/20 bg-background/50 hover:bg-white/10" variant="outline" onClick={() => handleAutomation('ready-toggle', {})}>
                    2. Toggle Ready (Latest Waiting)
                  </Button>
                  <Button size="sm" className="w-full justify-start border-white/20 bg-background/50 hover:bg-white/10" variant="outline" onClick={() => handleAutomation('auto-start', { type: lobbyType })}>
                    3. Force Start (Latest Waiting)
                  </Button>
                  <Button size="sm" className="w-full justify-start border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" variant="outline" onClick={() => handleAutomation('simulate-match', { type: lobbyType })}>
                    4. Simulate Match Results (Latest In Progress)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
              <CardHeader className="pb-3 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-base text-pink-400">Round Advancement</CardTitle>
                  <CardDescription>Auto-targets the latest active Phase and Round</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex flex-col gap-3">
                  <Button size="sm" className="w-full justify-start border-white/20 bg-background/50 hover:bg-white/10" variant="outline" onClick={() => handleAutomation('assign-lobby', {})}>
                    Assign Lobbies (Latest Pending Round)
                  </Button>
                  <Button size="sm" className="w-full justify-start border-pink-500/30 text-pink-400 bg-pink-500/10 hover:bg-pink-500/20" variant="outline" onClick={() => handleAutomation('advance-round', {})}>
                    Auto Advance (Latest Completed Round)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-black/40 shadow-inner">
            <CardHeader className="py-3 px-4 border-b border-white/10 flex flex-row items-center justify-between">
              <CardTitle className="text-xs tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                <Loader2 className={`w-3 h-3 ${automationLoading ? 'animate-spin opacity-100' : 'opacity-0'}`} />
                Execution Result
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-auto max-h-[300px] font-mono text-xs">
              {automationError ? (
                <div className="text-red-400">{automationError}</div>
              ) : automationResult ? (
                <pre className="text-emerald-400/90 whitespace-pre-wrap">{JSON.stringify(automationResult, null, 2)}</pre>
              ) : (
                <div className="text-muted-foreground/30">Select an action to view the result payload here.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
