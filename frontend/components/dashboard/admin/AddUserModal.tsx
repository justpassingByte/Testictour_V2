import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type AddUserData = {
  username: string;
  email?: string;
  password?: string;
  role: string;
  isGuest?: boolean;
  riotGameName?: string;
  riotGameTag?: string;
  region?: string;
  puuid?: string;
  discordId?: string;
};

export default function AddUserModal({
  open,
  onClose,
  onCreate,
  defaultGuest = true,
  defaultRole = "user",
}: {
  open: boolean;
  onClose: () => void;
  onCreate?: (data: AddUserData) => void;
  defaultGuest?: boolean;
  defaultRole?: string;
}) {
  const [isGuest, setIsGuest] = useState(defaultGuest);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [riotGameName, setRiotGameName] = useState("");
  const [riotGameTag, setRiotGameTag] = useState("");
  const [region, setRegion] = useState("vn2");
  const [puuid, setPuuid] = useState("");
  const [discordId, setDiscordId] = useState("");

  const reset = () => {
    setIsGuest(defaultGuest);
    setUsername("");
    setEmail("");
    setPassword("");
    setRole(defaultRole);
    setRiotGameName("");
    setRiotGameTag("");
    setRegion("vn2");
    setPuuid("");
    setDiscordId("");
  };

  const handleCreate = () => {
    const finalUsername = username.trim() || riotGameName.trim();

    onCreate?.({
      username: finalUsername,
      email: email.trim() || undefined,
      password: password || undefined,
      role: isGuest ? "guest" : role,
      isGuest,
      riotGameName: riotGameName.trim() || finalUsername,
      riotGameTag: riotGameTag.trim().replace(/^#/, ""),
      region,
      puuid: puuid.trim() || undefined,
      discordId: discordId.trim() || undefined,
    });

    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create player</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <Label>Guest / in-game only</Label>
              <p className="text-xs text-muted-foreground">No login account. Admin can assign this player to tournaments and lobbies.</p>
            </div>
            <Switch checked={isGuest} onCheckedChange={setIsGuest} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Riot game name *" value={riotGameName} onChange={(e) => setRiotGameName(e.target.value)} />
            <Input placeholder="Tag, e.g. VN2" value={riotGameTag} onChange={(e) => setRiotGameTag(e.target.value)} />
          </div>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger>
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vn2">Vietnam (VN2)</SelectItem>
              <SelectItem value="sg2">Singapore (SG2)</SelectItem>
              <SelectItem value="th2">Thailand (TH2)</SelectItem>
              <SelectItem value="ph2">Philippines (PH2)</SelectItem>
              <SelectItem value="tw2">Taiwan (TW2)</SelectItem>
              <SelectItem value="na1">North America (NA1)</SelectItem>
              <SelectItem value="euw1">Europe West (EUW1)</SelectItem>
              <SelectItem value="kr">Korea (KR)</SelectItem>
              <SelectItem value="jp1">Japan (JP1)</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="PUUID (optional, recommended for Riot result sync)" value={puuid} onChange={(e) => setPuuid(e.target.value)} />
          <Input placeholder="Discord/contact (optional)" value={discordId} onChange={(e) => setDiscordId(e.target.value)} />
          <Input placeholder="Display username (optional)" value={username} onChange={(e) => setUsername(e.target.value)} />

          {!isGuest && (
            <>
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </>
          )}

          <Select value={role} onValueChange={setRole} disabled={isGuest}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Player account</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleCreate} disabled={!riotGameName.trim() && !username.trim()}>Create player</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
