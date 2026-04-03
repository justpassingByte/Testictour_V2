"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign
} from "lucide-react"

interface Transaction {
  id: string
  userId: string
  username: string
  type: 'deposit' | 'withdrawal'
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  method: string
  createdAt: string
  processedAt?: string
  gatewayReference?: string
}

interface PaymentGatewayConfig {
  paymentGateway: boolean
  automaticWithdrawals: boolean
  playerDeposits: boolean
  withdrawalManagement: boolean
  customGateway: boolean
  gatewayProvider: string
  apiKey: string
  webhookSecret: string
  minimumWithdrawal: number
  maximumWithdrawal: number
  processingFee: number
}

export default function PaymentGatewayTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingTransactions: 0,
    processedToday: 0
  })

  useEffect(() => {
    fetchPaymentData()
  }, [])

  const fetchPaymentData = async () => {
    try {
      // Fetch transactions
      const transactionsResponse = await fetch('/api/partner/payment/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      })
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.data || [])
      }

      // Fetch config
      const configResponse = await fetch('/api/partner/payment/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      })
      
      if (configResponse.ok) {
        const configData = await configResponse.json()
        setConfig(configData.data)
      }

      // Fetch stats
      const statsResponse = await fetch('/api/partner/payment/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      })
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.data)
      }
    } catch (error) {
      console.error('Error fetching payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessTransaction = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/partner/payment/transactions/${transactionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        fetchPaymentData() // Refresh data
      }
    } catch (error) {
      console.error('Error processing transaction:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 border-t-transparent border-r-transparent mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading payment gateway data...</p>
      </div>
    )
  }

  if (!config?.paymentGateway) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payment Gateway</h1>
        </div>
        
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Payment Gateway Not Available</h3>
            <p className="text-muted-foreground mb-4">
              Upgrade to Pro or Enterprise plan to enable payment gateway features for managing player deposits and withdrawals.
            </p>
            <Button onClick={() => alert('Upgrade your plan to access Payment Gateway features')}>
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payment Gateway</h1>
        <div className="flex items-center space-x-2">
          <Badge variant={config.automaticWithdrawals ? "default" : "secondary"}>
            {config.automaticWithdrawals ? "Gateway Processing" : "Manual Processing"}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Gateway Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Payment Gateway Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Gateway Processing</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    Enable automatic processing through payment gateway instead of manual management
                  </p>
                </div>
                
                <div>
                  <Label>Gateway Provider</Label>
                  <Select value={config.gatewayProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Minimum Withdrawal</Label>
                  <Input type="number" value={config.minimumWithdrawal} readOnly />
                </div>
                
                <div>
                  <Label>Processing Fee (%)</Label>
                  <Input type="number" value={config.processingFee} readOnly />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={config.automaticWithdrawals} 
                      readOnly 
                      className="rounded"
                    />
                    <Label className="text-sm">
                      <strong>Automatic Withdrawal Processing</strong>
                      <div className="text-xs text-muted-foreground font-normal">
                        Gateway automatically processes approved withdrawals
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={config.playerDeposits} 
                      readOnly 
                      className="rounded"
                    />
                    <Label className="text-sm">
                      <strong>Player Deposits via Gateway</strong>
                      <div className="text-xs text-muted-foreground font-normal">
                        Players can deposit directly through payment gateway
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={config.withdrawalManagement} 
                      readOnly 
                      className="rounded"
                    />
                    <Label className="text-sm">
                      <strong>Manual Override Available</strong>
                      <div className="text-xs text-muted-foreground font-normal">
                      You can still manually review and override transactions
                      </div>
                    </Label>
                  </div>
                </div>
                
                {config.customGateway && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Custom Gateway</span>
                    </div>
                    <p className="text-xs text-purple-600">
                      Enterprise plan: Use your own payment gateway integration
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ArrowDownCircle className="mr-3 h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${stats.totalDeposits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ArrowUpCircle className="mr-3 h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">${stats.totalWithdrawals.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="mr-3 h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingTransactions}</p>
                <p className="text-xs text-muted-foreground">Pending Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="mr-3 h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.processedToday}</p>
                <p className="text-xs text-muted-foreground">Processed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              Transaction History
              {config.automaticWithdrawals && (
                <Badge variant="default" className="text-xs">
                  <CreditCard className="mr-1 h-3 w-3" />
                  Gateway Processing
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-green-600">
                <ArrowDownCircle className="mr-1 h-3 w-3" />
                Deposits
              </Badge>
              <Badge variant="outline" className="text-red-600">
                <ArrowUpCircle className="mr-1 h-3 w-3" />
                Withdrawals
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config.automaticWithdrawals && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Automatic Gateway Processing Enabled
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Deposits and withdrawals are processed automatically through {config.gatewayProvider}. 
                You can still manually review transactions if needed.
              </p>
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Processing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Wallet className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-muted-foreground">No transactions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.automaticWithdrawals 
                        ? "Transactions will appear here when players deposit or withdraw"
                        : "Transactions will appear here for manual processing"
                      }
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.username}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {transaction.type === 'deposit' ? (
                          <ArrowDownCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <CreditCard className="h-3 w-3 text-gray-500" />
                        <span>{transaction.method}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(transaction.status)}
                        {getStatusBadge(transaction.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {config.automaticWithdrawals ? (
                          <Badge variant="outline" className="text-xs">
                            <CreditCard className="mr-1 h-3 w-3" />
                            Gateway
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Settings className="mr-1 h-3 w-3" />
                            Manual
                          </Badge>
                        )}
                        
                        {transaction.status === 'pending' && config.withdrawalManagement && !config.automaticWithdrawals && (
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessTransaction(transaction.id, 'approve')}
                              className="text-green-600 hover:text-green-700 h-6 w-6 p-0"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessTransaction(transaction.id, 'reject')}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
