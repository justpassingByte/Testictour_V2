"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChevronRight, Upload, Palette, Settings, Users, DollarSign, Trophy, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useMiniTourLobbyStore, MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { useToast } from "@/components/ui/use-toast"
import api from "@/app/lib/apiConfig"
import Image from "next/image"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000"

export default function CreateOrEditLobbyPage() {
  const router = useRouter()
  const params = useParams()
  const lobbyId = params.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null
  const isEditMode = !!lobbyId

  const { createLobby, updateLobby, deleteLobby, isProcessingAction, isLoading } = useMiniTourLobbyStore()
  console.log("isProcessingAction on load:", isProcessingAction)
  const { toast } = useToast()

  const [lobbyData, setLobbyData] = useState({
    name: "",
    description: "",
    maxPlayers: 8,
    gameMode: "",
    entryFee: 0,
    entryType: "coins",
    prizeDistribution: "standard",
    theme: "default",
    rules: "",
    autoStart: true,
    privateMode: false,
    skillLevel: "all",
    partnerRevenueShare: 0.2,
  })

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState<string>("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditMode && lobbyId) {
      const fetchLobbyData = async () => {
        try {
          console.log('[EditLobby] Fetching lobby:', lobbyId);
          const response = await api.get<{ success: boolean; data: MiniTourLobby }>(`/minitour-lobbies/${lobbyId}`)
          console.log('[EditLobby] Response:', response.data);
          const existingLobby = response.data.data
          if (existingLobby) {
            console.log('[EditLobby] Existing lobby data:', existingLobby);
            setLobbyData({
              name: existingLobby.name,
              description: existingLobby.description || "",
              maxPlayers: existingLobby.maxPlayers,
              gameMode: existingLobby.gameMode,
              entryFee: existingLobby.entryFee,
              entryType: existingLobby.entryType,
              prizeDistribution: existingLobby.prizeDistribution?.type || "standard",
              theme: existingLobby.theme || "default",
              rules: existingLobby.rules ? existingLobby.rules.join("\n") : "",
              autoStart: existingLobby.settings?.autoStart ?? true,
              privateMode: existingLobby.settings?.privateMode ?? false,
              skillLevel: existingLobby.skillLevel,
              partnerRevenueShare: existingLobby.partnerRevenueShare ?? 0.2,
            })
            // Log the set data for verification
            console.log('[EditLobby] Set partnerRevenueShare to:', existingLobby.partnerRevenueShare ?? 0.2);
            setSelectedTags(existingLobby.tags || [])
            if (existingLobby.customLogoUrl) {
              const fullImageUrl = existingLobby.customLogoUrl.startsWith("http")
                ? existingLobby.customLogoUrl
                : `${API_BASE_URL}${existingLobby.customLogoUrl}`
              setImagePreview(fullImageUrl)
            }
          } else {
            toast({
              title: "Error",
              description: "Could not find lobby details for editing.",
              variant: "destructive",
            })
            router.push("/dashboard/partner")
          }
        } catch (error) {
          toast({
            title: "Fetch Error",
            description: "Failed to fetch lobby details. You may not have permission or the lobby does not exist.",
            variant: "destructive",
          })
          router.push("/dashboard/partner")
        }
      }
      fetchLobbyData()
    }
  }, [isEditMode, lobbyId, router, toast])

  const availableTags = [
    "competitive",
    "casual",
    "beginner",
    "advanced",
    "high-stakes",
    "training",
    "tournament",
    "fun",
    "ranked",
    "custom",
  ]

  const displayTags = [...new Set([...availableTags, ...selectedTags])]

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      setSelectedTags((prev) => [...prev, newTagInput.trim()])
      setNewTagInput("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lobbyData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Lobby name is required.",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      Object.entries(lobbyData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      // Always send tags as a comma-separated string
      formData.append("tags", selectedTags.join(","))

      if (selectedImage) {
        formData.append("customLogo", selectedImage)
      }

      if (isEditMode && lobbyId) {
        await updateLobby(lobbyId, formData, router)
        toast({ title: "Success", description: "Lobby updated successfully!" })
      } else {
        await createLobby(formData, router)
        toast({ title: "Success", description: "Lobby created successfully!" })
      }
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!lobbyId) return
    if (window.confirm("Are you sure you want to delete this lobby? This action cannot be undone.")) {
      try {
        await deleteLobby(lobbyId, router)
        toast({ title: "Success", description: "Lobby deleted successfully." })
      } catch (err: any) {
        toast({
          title: "Deletion Error",
          description: err.message || "Failed to delete lobby.",
          variant: "destructive",
        })
      }
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="container py-8">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard/partner">Partner Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/partner">MiniTours</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{isEditMode ? `Edit: ${lobbyData.name}` : "Create Lobby"}</span>
      </div>

      <div className="max-w-4xl mx-auto">
        <form id="lobby-form" onSubmit={handleSubmit}>
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold">{isEditMode ? "Edit Lobby" : "Create New Lobby"}</h1>
              <p className="text-muted-foreground">
                {isEditMode
                  ? "Update the details of your existing lobby."
                  : "Set up a custom lobby for your community with personalized settings and branding."}
              </p>
            </div>
            <div className="flex space-x-2">
              {isEditMode && (
                <Button variant="destructive" onClick={handleDelete} disabled={isProcessingAction}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button type="submit" form="lobby-form" className="flex items-center" disabled={isProcessingAction}>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? "Save Changes" : "Create Lobby"}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary" />
                    Basic Information
                  </CardTitle>
                  <CardDescription>Set up the fundamental details for your lobby</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Lobby Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter lobby name"
                        value={lobbyData.name}
                        onChange={(e) => setLobbyData({ ...lobbyData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxPlayers">Max Players</Label>
                      <Select
                        value={lobbyData.maxPlayers.toString()}
                        onValueChange={(value) => setLobbyData({ ...lobbyData, maxPlayers: Number.parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 Players</SelectItem>
                          <SelectItem value="6">6 Players</SelectItem>
                          <SelectItem value="8">8 Players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your lobby and what makes it special"
                      value={lobbyData.description}
                      onChange={(e) => setLobbyData({ ...lobbyData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gameMode">Game Mode</Label>
                      <Select
                        value={lobbyData.gameMode}
                        onValueChange={(value) => setLobbyData({ ...lobbyData, gameMode: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select game mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ranked">Ranked</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skillLevel">Skill Level</Label>
                      <Select
                        value={lobbyData.skillLevel}
                        onValueChange={(value) => setLobbyData({ ...lobbyData, skillLevel: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {displayTags.map((tag: string) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <Input
                        placeholder="Add new tag"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                      />
                      <Button onClick={handleAddTag} type="button" disabled={!newTagInput.trim()}>
                        Add Tag
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Select tags that describe your lobby to help players find it, or add new ones.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-primary" />
                    Entry & Pricing
                  </CardTitle>
                  <CardDescription>Configure entry fees and prize distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="entryType">Entry Type</Label>
                      <Select
                        value={lobbyData.entryType}
                        onValueChange={(value) => setLobbyData({ ...lobbyData, entryType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coins">Coins</SelectItem>
                          <SelectItem value="usd">USD</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entryFee">Entry Fee</Label>
                      <Input
                        id="entryFee"
                        type="number"
                        placeholder="0"
                        value={lobbyData.entryFee}
                        onChange={(e) => setLobbyData({ ...lobbyData, entryFee: Number.parseInt(e.target.value) || 0 })}
                        disabled={lobbyData.entryType === "free"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnerRevenueShare">Partner Share (%)</Label>
                      <Input
                        id="partnerRevenueShare"
                        type="number"
                        placeholder="20"
                        min="0"
                        max="100"
                        value={Math.round((lobbyData.partnerRevenueShare || 0) * 100)}
                        onChange={(e) => setLobbyData({ ...lobbyData, partnerRevenueShare: (parseFloat(e.target.value) || 0) / 100 })}
                        disabled={lobbyData.entryType === "free"}
                      />
                      <p className="text-xs text-muted-foreground">Percentage of entry fees you keep.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prizeDistribution">Prize Distribution</Label>
                    <Select
                      value={lobbyData.prizeDistribution}
                      onValueChange={(value) => setLobbyData({ ...lobbyData, prizeDistribution: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (50/30/20)</SelectItem>
                        <SelectItem value="winner-takes-all">Winner Takes All</SelectItem>
                        <SelectItem value="top-half">Top Half Split</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5 text-primary" />
                    Lobby Settings
                  </CardTitle>
                  <CardDescription>Configure how your lobby operates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Start</Label>
                        <p className="text-sm text-muted-foreground">Automatically start matches when lobby is full</p>
                      </div>
                      <Switch
                        checked={lobbyData.autoStart}
                        onCheckedChange={(checked) => setLobbyData({ ...lobbyData, autoStart: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Private Mode</Label>
                        <p className="text-sm text-muted-foreground">Require invitation to join</p>
                      </div>
                      <Switch
                        checked={lobbyData.privateMode}
                        onCheckedChange={(checked) => setLobbyData({ ...lobbyData, privateMode: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rules">Custom Rules</Label>
                    <Textarea
                      id="rules"
                      placeholder="Enter any custom rules or special conditions for your lobby"
                      value={lobbyData.rules}
                      onChange={(e) => setLobbyData({ ...lobbyData, rules: e.target.value })}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5 text-primary" />
                    Visual Branding
                  </CardTitle>
                  <CardDescription>Customize the appearance of your lobby</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select
                      value={lobbyData.theme}
                      onValueChange={(value) => setLobbyData({ ...lobbyData, theme: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="colorful">Colorful</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Custom Logo</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {imagePreview ? (
                        <div className="relative group">
                          <Image src={imagePreview} alt="Lobby Logo" className="mx-auto max-h-40 rounded-lg" />
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Label
                              htmlFor="customLogo"
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 cursor-pointer border border-white/50 bg-transparent text-white hover:bg-white/10"
                            >
                              Change Logo
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload your lobby logo (PNG, JPG up to 2MB)
                          </p>
                          <input
                            id="customLogo"
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={handleImageChange}
                            ref={fileInputRef}
                          />
                          <Label
                            htmlFor="customLogo"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
                          >
                            Choose File
                          </Label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded border bg-primary"></div>
                        <Input placeholder="#3B82F6" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded border bg-accent"></div>
                        <Input placeholder="#10B981" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-primary" />
                    Review & Create
                  </CardTitle>
                  <CardDescription>Review your lobby settings before creating</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span>{lobbyData.name || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Players:</span>
                          <span>{lobbyData.maxPlayers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Game Mode:</span>
                          <span>{lobbyData.gameMode || "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Skill Level:</span>
                          <span>{lobbyData.skillLevel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Pricing & Settings</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Entry Type:</span>
                          <span className="capitalize">{lobbyData.entryType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Entry Fee:</span>
                          <span>{lobbyData.entryFee || "Free"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prize Distribution:</span>
                          <span className="capitalize">{lobbyData.prizeDistribution.replace("-", " ")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Auto Start:</span>
                          <span>{lobbyData.autoStart ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedTags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {lobbyData.description && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Description</h3>
                      <p className="text-sm text-muted-foreground">{lobbyData.description}</p>
                    </div>
                  )}

                  {lobbyData.rules && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Custom Rules</h3>
                      <p className="text-sm text-muted-foreground">{lobbyData.rules}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Link href="/dashboard/partner">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  )
}