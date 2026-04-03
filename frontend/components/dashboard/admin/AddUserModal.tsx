import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddUserModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate?: (data: { username: string; email: string; password: string; role: string }) => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // Default role

  const handleCreate = () => {
    onCreate?.({ username, email, password, role });
    setUsername("");
    setEmail("");
    setPassword("");
    setRole("user"); // Reset role to default
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Thêm người dùng mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Select onValueChange={(value) => setRole(value)} defaultValue={role}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Người dùng</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="admin">Quản trị viên</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={handleCreate}>Tạo người dùng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 