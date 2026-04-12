"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Camera, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useUserStore } from "@/app/stores/userStore";

interface PlayerHeaderProps {
  inGameName: string;
  region: string;
  username?: string;
  rank: string;
  level: number;
  puuid?: string;
  riotGameTag?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  userId?: string;
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
  avatarUrl,
  backgroundUrl,
  userId,
}: PlayerHeaderProps) {
  const { currentUser } = useUserStore();
  const isOwner = !!(currentUser?.id && userId && currentUser.id === userId);

  const defaultAvatar = `https://api.dicebear.com/9.x/shapes/svg?seed=${inGameName}`;
  const gridBackgroundStyle = {
    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
    backgroundColor: '#0a0a0a'
  };

  const finalBackgroundStyle = backgroundUrl 
    ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } 
    : gridBackgroundStyle;

  return (
    <Card className="overflow-hidden bg-card/95 dark:bg-card/40 shadow-sm backdrop-blur-lg border border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      {/* Premium gradient banner */}
      <div className={`h-32 relative overflow-hidden ${isOwner ? 'group/banner cursor-pointer' : ''}`}
           style={finalBackgroundStyle}>
        
        {isOwner && (
          <div className="absolute inset-0 bg-black/0 group-hover/banner:bg-black/40 transition-colors duration-300 flex items-center justify-center z-20">
            <label className="cursor-pointer opacity-0 group-hover/banner:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-white bg-black/60 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm border border-white/20 hover:bg-black/80">
              <ImageIcon className="w-4 h-4" />
              <span>Change Cover</span>
              <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
            </label>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card/90 to-transparent z-10" />
        
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
          <div className={`relative ${isOwner ? 'group/avatar cursor-pointer' : ''}`}>
            <Avatar className={`h-24 w-24 ring-4 ring-background shadow-xl shrink-0 ${isOwner ? 'group-hover/avatar:opacity-80' : ''} transition-opacity`}>
              <AvatarImage src={avatarUrl || defaultAvatar} alt={inGameName} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 text-white">
                {inGameName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 z-10 cursor-pointer rounded-full bg-black/40 backdrop-blur-sm">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
                <input type="file" accept="image/*" className="hidden" onChange={() => {}} />
              </label>
            )}
          </div>
          
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-baseline gap-2">
                {inGameName} 
                <span className="text-xl md:text-2xl text-muted-foreground font-semibold">#{riotGameTag}</span>
              </h1>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}