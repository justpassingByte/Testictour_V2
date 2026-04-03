"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface AddPlayerModalProps {
  open: boolean
  onClose: () => void
  onCreate: (playerData: any) => void
}

export default function AddPlayerModal({ open, onClose, onCreate }: AddPlayerModalProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    riotGameName: '',
    riotGameTag: '',
    region: '',
    role: 'user'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(formData)
    setFormData({
      username: '',
      email: '',
      password: '',
      riotGameName: '',
      riotGameTag: '',
      region: '',
      role: 'user'
    })
    onClose()
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="riotGameName" className="text-right">
                Riot Game Name
              </Label>
              <Input
                id="riotGameName"
                value={formData.riotGameName}
                onChange={(e) => handleChange('riotGameName', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="riotGameTag" className="text-right">
                Riot Tag
              </Label>
              <Input
                id="riotGameTag"
                value={formData.riotGameTag}
                onChange={(e) => handleChange('riotGameTag', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="region" className="text-right">
                Region
              </Label>
              <Select value={formData.region} onValueChange={(value) => handleChange('region', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">North America</SelectItem>
                  <SelectItem value="EU">Europe</SelectItem>
                  <SelectItem value="KR">Korea</SelectItem>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="OCE">Oceania</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Player</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
