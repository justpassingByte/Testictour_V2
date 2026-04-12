"use client"

import Link from "next/link"
import Image from "next/image"
import { Star, Coins } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"

interface LobbyHeaderProps {
  lobby: MiniTourLobby
  getThemeStyle: (theme: string | undefined) => string
}

export function LobbyHeader({ lobby, getThemeStyle }: LobbyHeaderProps) {
  const bannerSrc = lobby.customLogoUrl 
    ? `${(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')}${lobby.customLogoUrl}`
    : "/hero-bg.png";

  return (
    <Card className={`${getThemeStyle(lobby.theme)} overflow-hidden`}>
      <div className="relative w-full h-48 md:h-64 bg-muted">
        <Image
          src={bannerSrc}
          alt={`${lobby.name} Banner`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
      </div>
      
      <CardContent className="relative -mt-16 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">{lobby.name}</h1>
              {lobby.status === "WAITING" && lobby.currentPlayers >= lobby.maxPlayers / 2 && (
                <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Filling Up</Badge>
              )}
              {lobby.status === "IN_PROGRESS" && (
                <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">In Progress</Badge>
              )}
              {lobby.status === "COMPLETED" && (
                <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Completed</Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mb-3">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">{lobby.averageRating}</span>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-4 max-w-2xl">{lobby.description}</p>
            
            <div className="flex flex-wrap gap-2">
              {lobby.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 