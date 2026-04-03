"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Trophy } from "lucide-react"
import { MiniTourLobby } from "@/app/stores/miniTourLobbyStore"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ManualResultDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lobby: MiniTourLobby
    onSubmit: (placements: { userId: string; placement: number }[]) => Promise<void>
}

export function ManualResultDialog({ open, onOpenChange, lobby, onSubmit }: ManualResultDialogProps) {
    const [placements, setPlacements] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePlacementChange = (userId: string, value: string) => {
        setPlacements(prev => ({ ...prev, [userId]: value }))
        setError(null)
    }

    const validatePlacements = (): boolean => {
        // Check if all participants have placements
        const allParticipantsHavePlacements = lobby.participants.every(
            p => placements[p.userId] && placements[p.userId].trim() !== ''
        )

        if (!allParticipantsHavePlacements) {
            setError('Please enter placements for all participants')
            return false
        }

        // Check if all placements are valid numbers
        const placementValues = Object.values(placements).map(v => parseInt(v))
        const hasInvalidNumbers = placementValues.some(v => isNaN(v) || v < 1 || v > lobby.participants.length)

        if (hasInvalidNumbers) {
            setError(`Placements must be between 1 and ${lobby.participants.length}`)
            return false
        }

        // Check for duplicate placements
        const uniquePlacements = new Set(placementValues)
        if (uniquePlacements.size !== placementValues.length) {
            setError('Each player must have a unique placement')
            return false
        }

        return true
    }

    const handleSubmit = async () => {
        if (!validatePlacements()) return

        setIsSubmitting(true)
        setError(null)

        try {
            const placementData = lobby.participants.map(p => ({
                userId: p.userId,
                placement: parseInt(placements[p.userId])
            }))

            await onSubmit(placementData)
            onOpenChange(false)
            setPlacements({}) // Reset form
        } catch (err: any) {
            setError(err.message || 'Failed to submit results')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Calculate points preview
    const calculatePoints = (placement: number) => {
        return Math.max(0, lobby.participants.length - placement + 1)
    }

    // Sort participants by current placement input (if available)
    const sortedParticipants = [...lobby.participants].sort((a, b) => {
        const aPlacement = parseInt(placements[a.userId]) || 999
        const bPlacement = parseInt(placements[b.userId]) || 999
        return aPlacement - bPlacement
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Enter Match Results
                    </DialogTitle>
                    <DialogDescription>
                        Enter the placement (1st, 2nd, 3rd, etc.) for each player. Points will be calculated automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead className="w-[120px]">Placement</TableHead>
                                <TableHead className="w-[100px] text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedParticipants.map((participant, index) => {
                                const placementValue = placements[participant.userId]
                                const placement = parseInt(placementValue)
                                const points = !isNaN(placement) ? calculatePoints(placement) : 0
                                const isFirst = placementValue === '1'

                                return (
                                    <TableRow key={participant.userId} className={isFirst ? 'bg-yellow-500/10' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isFirst && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                <span className="font-medium">{participant.user.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="1"
                                                max={lobby.participants.length}
                                                value={placementValue || ''}
                                                onChange={(e) => handlePlacementChange(participant.userId, e.target.value)}
                                                placeholder={`1-${lobby.participants.length}`}
                                                className="w-full"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!isNaN(placement) && (
                                                <Badge variant={isFirst ? 'default' : 'secondary'}>
                                                    {points} pts
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>

                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="bg-muted p-3 rounded-md text-sm">
                        <p className="font-semibold mb-1">Point System:</p>
                        <p className="text-muted-foreground">
                            Points = (Total Players - Placement + 1)
                            <br />
                            Example: 1st place = {lobby.participants.length} points,
                            2nd place = {lobby.participants.length - 1} points, etc.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Results'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
