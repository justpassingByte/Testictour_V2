"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react"

interface WithdrawModalProps {
  open: boolean
  onClose: () => void
  onWithdraw: (withdrawData: any) => void
  currentBalance: number
  totalRevenue: number
}

export default function WithdrawModal({ open, onClose, onWithdraw, currentBalance, totalRevenue }: WithdrawModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    method: 'bank_transfer',
    accountNumber: '',
    accountName: '',
    bankName: '',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const withdrawAmount = parseFloat(formData.amount)
    if (withdrawAmount > currentBalance) {
      alert('Withdrawal amount cannot exceed current balance')
      return
    }
    
    if (withdrawAmount <= 0) {
      alert('Withdrawal amount must be greater than 0')
      return
    }

    onWithdraw(formData)
    setFormData({
      amount: '',
      method: 'bank_transfer',
      accountNumber: '',
      accountName: '',
      bankName: '',
      notes: ''
    })
    onClose()
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const availableBalance = currentBalance
  const withdrawFee = formData.amount ? parseFloat(formData.amount) * 0.02 : 0 // 2% fee
  const netAmount = formData.amount ? parseFloat(formData.amount) - withdrawFee : 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Balance Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Current Balance
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${availableBalance.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center text-muted-foreground">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Total Revenue
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${totalRevenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Form */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount ($)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max={availableBalance}
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="col-span-3"
                placeholder="Enter withdrawal amount"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Method
              </Label>
              <Select value={formData.method} onValueChange={(value) => handleChange('method', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select withdrawal method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.method === 'bank_transfer' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bankName" className="text-right">
                    Bank Name
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    className="col-span-3"
                    placeholder="Enter bank name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountName" className="text-right">
                    Account Name
                  </Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => handleChange('accountName', e.target.value)}
                    className="col-span-3"
                    placeholder="Enter account name"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountNumber" className="text-right">
                    Account Number
                  </Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleChange('accountNumber', e.target.value)}
                    className="col-span-3"
                    placeholder="Enter account number"
                    required
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="col-span-3"
                placeholder="Optional notes"
              />
            </div>

            {/* Fee Summary */}
            {formData.amount && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Withdrawal Amount:</span>
                      <span className="font-medium">${parseFloat(formData.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Fee (2%):</span>
                      <span className="font-medium text-red-600">-${withdrawFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Net Amount:</span>
                      <span className="font-bold text-green-600">${netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning */}
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="mr-2 h-4 w-4 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Withdrawals take 3-5 business days to process</li>
                  <li>Minimum withdrawal: $10.00</li>
                  <li>Processing fee: 2% of withdrawal amount</li>
                  <li>Bank transfers may have additional fees</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.amount || parseFloat(formData.amount) > availableBalance}>
              Withdraw ${netAmount.toFixed(2)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
