'use client';

import { useState } from 'react';
import { Loader2, Zap, AlertCircle, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MatchCompPanel } from '@/components/match/MatchCompPanel';
import { GrimoireMatchData } from '@/app/types/riot';
import api from '@/app/lib/apiConfig';

const REGIONS = ['sea', 'asia', 'europe', 'americas'];

export default function TestRiotApiPage() {
  const [gameName, setGameName]   = useState('');
  const [tagLine,  setTagLine]    = useState('');
  const [region,   setRegion]     = useState('sea');
  const [loading,  setLoading]    = useState(false);
  const [matchData, setMatchData] = useState<GrimoireMatchData | null>(null);
  const [error,    setError]      = useState<string | null>(null);
  const [raw,      setRaw]        = useState(false);

  async function fetch() {
    setLoading(true);
    setError(null);
    setMatchData(null);
    try {
      const body: Record<string, string> = { region };
      if (gameName) body.gameName = gameName;
      if (tagLine)  body.tagLine  = tagLine;

      const res = await api.post('/dev/test-riot-match', body);
      if (res.data.success && res.data.match) {
        setMatchData(res.data.match);
      } else {
        setError(res.data.error || 'No match found');
      }
    } catch (e: any) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Riot API Live Test</h1>
          <p className="text-sm text-muted-foreground">Fetch a real TFT match via Grimoire and preview it with MatchCompPanel</p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-white/10 bg-card/60 backdrop-blur-lg mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Query Parameters</CardTitle>
          <CardDescription>
            Leave blank to use the first DB user with a PUUID as test subject.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Game Name</Label>
              <Input
                placeholder="e.g. Faker"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tag Line</Label>
              <Input
                placeholder="e.g. KR1"
                value={tagLine}
                onChange={e => setTagLine(e.target.value)}
                className="bg-black/30 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="bg-black/30 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => (
                    <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={fetch}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Zap className="w-4 h-4" />
              }
              {loading ? 'Fetching...' : 'Fetch from Riot API'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6 text-red-400">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {matchData && (
        <Card className="border-white/10 bg-card/60 backdrop-blur-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                ✅ Real Match Retrieved & Seeded to DB
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Visible in Tournament UI
                </Badge>
                <Badge variant="outline" className="font-mono text-[10px]">{matchData.matchId}</Badge>
                <Badge variant="secondary">Set {matchData.tftSetNumber}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => setRaw(r => !r)}
                >
                  {raw ? 'Show UI' : 'Show Raw JSON'}
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
    </div>
  );
}
