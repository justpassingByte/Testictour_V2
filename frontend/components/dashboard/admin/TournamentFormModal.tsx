import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AdminTournament } from "@/app/stores/adminTournamentStore";

export default function TournamentFormModal({ open, onClose, onSubmit, initialData }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<AdminTournament>) => void;
  initialData?: Partial<AdminTournament>;
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    setName(initialData?.name || "");
    setStatus(initialData?.status || "");
    setStartDate(initialData?.startDate || "");
    setEndDate(initialData?.endDate || "");
  }, [initialData, open]);

  const handleSubmit = () => {
    onSubmit({ name, status, startDate, endDate });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Sửa Tournament" : "Thêm Tournament"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Status" value={status} onChange={e => setStatus(e.target.value)} />
          <Input placeholder="Start Date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input placeholder="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <DialogFooter className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={handleSubmit}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 