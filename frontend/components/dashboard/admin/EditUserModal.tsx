import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";

export default function EditUserModal({ open, onClose, user, onUpdate }: { open: boolean; onClose: () => void; user: any; onUpdate?: (id: string, data: any) => void }) {
  const t = useTranslations("common");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setRole(user.role || "user");
    }
  }, [user]);

  const handleUpdate = () => {
    if (user && user.id) {
      onUpdate?.(user.id, { username, email, role });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("edit_partner", { defaultValue: "Cập nhật thông tin" })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Select onValueChange={(value) => setRole(value)} value={role}>
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
          <Button variant="outline" onClick={onClose}>{t("close", { defaultValue: "Đóng" })}</Button>
          <Button onClick={handleUpdate}>{t("update", { defaultValue: "Cập nhật" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
