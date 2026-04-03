"use client";
import { useAdminUserStore, ITransaction, AdminUserDetail } from "@/app/stores/adminUserStore";
import { useEffect, useState } from "react";
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserDetailModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export default function UserDetailModal({ open, onClose, userId }: UserDetailModalProps) {
  // --- State Hooks ---
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<AdminUserDetail>>({});
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // --- Zustand Store Selectors ---
  const selectedUserDetail = useAdminUserStore((state) => state.selectedUserDetail);
  const loading = useAdminUserStore((state) => state.loading);
  const fetchUserDetail = useAdminUserStore((state) => state.fetchUserDetail);
  const updateUser = useAdminUserStore((state) => state.updateUser);
  const deposit = useAdminUserStore((state) => state.deposit);

  // --- Effect Hooks ---
  useEffect(() => {
    if (open && userId) {
      fetchUserDetail(userId);
      setIsEditing(false); // Reset edit mode on open
    }
  }, [open, userId, fetchUserDetail]);

  useEffect(() => {
    // Sync edit form when user data is loaded or changed
    if (selectedUserDetail) {
      setEditData({
        username: selectedUserDetail.username,
        email: selectedUserDetail.email,
        role: selectedUserDetail.role,
        riotGameName: selectedUserDetail.riotGameName,
        riotGameTag: selectedUserDetail.riotGameTag,
      });
    }
  }, [selectedUserDetail]);

  // --- Event Handlers ---
  const handleChange = (field: keyof AdminUserDetail, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;
      await updateUser(userId, editData);
    setIsEditing(false);
  };

  const handleDeposit = async () => {
    if (!userId || !depositAmount) return;
    setError(null);
    try {
      const amountNumber = parseFloat(depositAmount);
      await deposit(userId, amountNumber);
      setDepositAmount(''); 
    } catch (err) {
      setError("Nạp tiền thất bại. Vui lòng thử lại.");
    }
  };

  // --- Render Helper ---
  const renderInfoField = (label: string, value: any, fieldName?: keyof AdminUserDetail, isSelect = false, options: {value: string, label: string}[] = []) => {
    if (isEditing && fieldName) {
        if (isSelect) {
            return (
                <Select onValueChange={(value) => handleChange(fieldName, value)} defaultValue={value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            )
        }
        return <Input value={editData[fieldName] as string || ''} onChange={e => handleChange(fieldName, e.target.value)} />;
    }
    return <span className="font-medium">{value}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chi tiết người dùng</DialogTitle>
        </DialogHeader>
        
        {loading && !selectedUserDetail ? (
          <div className="flex items-center justify-center h-full">Đang tải...</div>
        ) : selectedUserDetail ? (
          <div className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Username</Label>
                    <div className="col-span-2">{renderInfoField('Username', selectedUserDetail.username, 'username')}</div>
              </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="col-span-2">{renderInfoField('Email', selectedUserDetail.email, 'email')}</div>
            </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Vai trò</Label>
                    <div className="col-span-2">{renderInfoField('Vai trò', selectedUserDetail.role, 'role', true, [{value: 'user', label: 'User'}, {value: 'partner', label: 'Partner'}, {value: 'admin', label: 'Admin'}])}</div>
              </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Riot ID</Label>
                    <div className="col-span-2 flex gap-2">
                {isEditing ? (
                            <>
                                <Input value={editData.riotGameName || ''} onChange={e => handleChange('riotGameName', e.target.value)} placeholder="Game Name"/>
                                <Input value={editData.riotGameTag || ''} onChange={e => handleChange('riotGameTag', e.target.value)} placeholder="Tag"/>
                            </>
                        ) : (
                            <span className="font-medium">{selectedUserDetail.riotGameName}#{selectedUserDetail.riotGameTag}</span>
                )}
              </div>
            </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">PUUID</Label>
                    <div className="col-span-2">{renderInfoField('PUUID', selectedUserDetail.puuid, 'puuid')}</div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Region</Label>
                    <div className="col-span-2">{renderInfoField('Region', selectedUserDetail.region, 'region')}</div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <Label className="text-muted-foreground">Số dư</Label>
                    <div className="col-span-2 font-bold text-green-600">{selectedUserDetail.balance.toLocaleString('vi-VN')} đ</div>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="font-semibold text-lg mb-2">Nạp tiền</h4>
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                    <Input 
                      type="number" 
                      placeholder="Nhập số tiền cần nạp"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                     {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
                <Button onClick={handleDeposit} disabled={loading}>{loading ? 'Đang nạp...' : 'Nạp tiền'}</Button>
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold text-lg mb-2">Lịch sử giao dịch</h4>
                <div className="border rounded-md">
                <Table>
                        <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {selectedUserDetail.transactions?.length ? (
                            selectedUserDetail.transactions.map((tx: ITransaction) => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="capitalize">{tx.type}</TableCell>
                                <TableCell className={tx.type === 'deposit' || tx.type === 'reward' ? 'text-green-500' : 'text-red-500'}>
                                {tx.type === 'deposit' || tx.type === 'reward' ? '+' : '-'}
                                {tx.amount.toLocaleString('vi-VN')} đ
                        </TableCell>
                        <TableCell>
                                <Badge variant={tx.status === 'success' ? 'default' : tx.status === 'pending' ? 'outline' : 'destructive'}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center h-24">Không có giao dịch nào.</TableCell></TableRow>
                        )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">Không thể tải thông tin người dùng.</div>
        )}
        <DialogFooter className="mt-auto pt-4 border-t">
            {isEditing ? (
            <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Hủy</Button>
                    <Button onClick={handleSave} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
            </>
            ) : (
                <Button onClick={() => setIsEditing(true)}>Chỉnh sửa</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 