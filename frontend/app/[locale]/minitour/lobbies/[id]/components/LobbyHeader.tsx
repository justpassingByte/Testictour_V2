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
  return (
    <Card className={`${getThemeStyle(lobby.theme)}`}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-4">
          <div className="aspect-video w-32 rounded-lg overflow-hidden border">
            {lobby.customLogoUrl && (
              <Image
                src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/'}${lobby.customLogoUrl}`}
                alt={`${lobby.name} Custom Logo`}
                className="w-full h-full object-cover"
                width={100}
                height={100}
                priority
              />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-3xl font-bold">{lobby.name}</h1>
              {lobby.status === "WAITING" && lobby.currentPlayers >= lobby.maxPlayers / 2 && (
                <Badge className="bg-green-500/20 text-green-500">Filling Up</Badge>
              )}
              {lobby.status === "IN_PROGRESS" && (
                <Badge className="bg-blue-500/20 text-blue-500">In Progress</Badge>
              )}
              {lobby.status === "COMPLETED" && (
                <Badge className="bg-yellow-500/20 text-yellow-500">Completed</Badge>
              )}
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">{lobby.averageRating}</span>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">{lobby.description}</p>
            <div className="flex flex-wrap gap-2">
              {lobby.tags.map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
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