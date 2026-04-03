"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Star, Target, Flame, MapPin, Shield, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PlayerHeaderProps {
  inGameName: string;
  region: string;
  username?: string;
  rank: string;
  level: number;
  puuid?: string;
  riotGameTag?: string;
}

function getRankGradient(rank: string) {
  if (rank.includes("Challenger")) return "from-amber-400/30 via-yellow-500/20 to-transparent"
  if (rank.includes("Grandmaster")) return "from-red-500/30 via-rose-500/20 to-transparent"
  if (rank.includes("Master")) return "from-violet-500/30 via-purple-500/20 to-transparent"
  if (rank.includes("Diamond")) return "from-cyan-400/30 via-blue-500/20 to-transparent"
  return "from-primary/20 via-primary/10 to-transparent"
}

function getRankBadgeStyle(rank: string) {
  if (rank.includes("Challenger")) return "bg-gradient-to-r from-amber-400 to-yellow-600 text-white border-none"
  if (rank.includes("Grandmaster")) return "bg-gradient-to-r from-red-500 to-rose-700 text-white border-none"
  if (rank.includes("Master")) return "bg-gradient-to-r from-violet-500 to-purple-700 text-white border-none"
  if (rank.includes("Diamond")) return "bg-gradient-to-r from-cyan-400 to-blue-600 text-white border-none"
  return ""
}

export function PlayerHeader({
  inGameName,
  region,
  username,
  rank,
  level,
  puuid,
  riotGameTag,
}: PlayerHeaderProps) {
  const [copied, setCopied] = useState(false);
  
  const copyPuuid = () => {
    if (puuid) {
      navigator.clipboard.writeText(puuid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="overflow-hidden bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      {/* Premium gradient banner */}
      <div className={`h-32 bg-gradient-to-r ${getRankGradient(rank)} relative overflow-hidden`}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/90 to-transparent" />
        
        {/* Rank badge floating */}
        <div className="absolute top-4 right-4">
          <Badge className={`text-sm px-3 py-1 font-bold shadow-lg ${getRankBadgeStyle(rank)}`}>
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            {rank}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6 -mt-12 relative z-10">
        <div className="flex items-end space-x-5">
          {/* Avatar overlapping the banner */}
          <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl shrink-0">
            <AvatarImage src={`/placeholder-user.jpg`} alt={username} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 text-white">
              {username?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{username}</h1>
              <Badge variant="outline" className="text-sm font-semibold">
                Lv. {level || 312}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {region}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {inGameName} #{riotGameTag}
              </span>
            </div>
          </div>
        </div>
        
        {/* PUUID row */}
        {puuid && (
          <div className="mt-4 flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <span className="text-xs text-muted-foreground font-medium">PUUID</span>
            <span className="text-xs font-mono truncate flex-1">{puuid}</span>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyPuuid}>
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}