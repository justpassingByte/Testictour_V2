"use client";

import { useState, useMemo } from "react";
import { ITransaction } from "@/app/stores/adminUserStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowUpDown,
    Search,
    ArrowDownRight,
    ArrowUpRight,
    DollarSign,
    TrendingUp,
    Wallet,
    Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PartnerTransactionsTabProps {
    transactions: ITransaction[];
    partnerName?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: "in" | "out" | "neutral" }> = {
    deposit: { label: "Deposit", color: "bg-green-500/10 text-green-500 border-green-500/20", icon: "in" },
    withdraw: { label: "Withdraw", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: "out" },
    refund: { label: "Refund", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: "in" },
    entry_fee: { label: "Entry Fee", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: "out" },
    reward: { label: "Reward", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: "in" },
    revenue_share: { label: "Revenue Share", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: "in" },
    prize: { label: "Prize", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: "out" },
    subscription_payment: { label: "Subscription Payment", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: "out" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    success: { label: "Success", color: "bg-green-500/10 text-green-500 border-green-500/20" },
    pending: { label: "Pending", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    failed: { label: "Failed", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

export default function PartnerTransactionsTab({ transactions, partnerName }: PartnerTransactionsTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState<"date" | "amount">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Summary stats
    const stats = useMemo(() => {
        const successful = transactions.filter(t => t.status === "success");
        const totalDeposits = successful
            .filter(t => t.type === "deposit")
            .reduce((sum, t) => sum + t.amount, 0);
        const totalRevenueShare = successful
            .filter(t => t.type === "revenue_share")
            .reduce((sum, t) => sum + t.amount, 0);
        const totalWithdrawals = successful
            .filter(t => t.type === "withdraw")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalPrizes = successful
            .filter(t => t.type === "prize")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalSubPayments = successful
            .filter(t => t.type === "subscription_payment")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        return { totalDeposits, totalRevenueShare, totalWithdrawals, totalPrizes, totalSubPayments, total: transactions.length };
    }, [transactions]);

    // Filtered and sorted transactions
    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const matchesSearch =
                    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.refId && t.refId.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesType = typeFilter === "all" || t.type === typeFilter;
                const matchesStatus = statusFilter === "all" || t.status === statusFilter;
                return matchesSearch && matchesType && matchesStatus;
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === "date") {
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                } else {
                    comparison = Math.abs(a.amount) - Math.abs(b.amount);
                }
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [transactions, searchQuery, typeFilter, statusFilter, sortBy, sortOrder]);

    // Get unique transaction types for filter
    const uniqueTypes = useMemo(() => {
        return [...new Set(transactions.map(t => t.type))];
    }, [transactions]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAmount = (amount: number, type: string) => {
        const config = TYPE_CONFIG[type];
        const isIncoming = config?.icon === "in";
        const prefix = isIncoming ? "+" : "-";
        return `${prefix}$${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Deposits</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">${stats.totalDeposits.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-blue-500/20 bg-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Share</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">${stats.totalRevenueShare.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-red-500/20 bg-red-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Withdrawals</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">${stats.totalWithdrawals.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-purple-500/20 bg-purple-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Prizes Paid</CardTitle>
                        <Wallet className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-500">${stats.totalPrizes.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-indigo-500/20 bg-indigo-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Sub Payments</CardTitle>
                        <Receipt className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-500">${stats.totalSubPayments.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Transactions ({filteredTransactions.length})
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="relative w-56">
                            <Input
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {uniqueTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {TYPE_CONFIG[type]?.label || type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center border rounded-md">
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "amount")}>
                                <SelectTrigger className="w-[120px] border-none shadow-none focus:ring-0">
                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="amount">Amount</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-2"
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            >
                                {sortOrder === "asc" ? "ASC" : "DESC"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No transactions found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="w-[120px]">ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map((tx) => {
                                    const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, color: "bg-slate-500/10 text-slate-400", icon: "neutral" };
                                    const statusConfig = STATUS_CONFIG[tx.status] || { label: tx.status, color: "bg-slate-500/10 text-slate-400" };
                                    const isIncoming = typeConfig.icon === "in";

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDate(tx.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                                                    {isIncoming ? (
                                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                                    )}
                                                    {typeConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${isIncoming ? "text-green-500" : "text-red-500"}`}>
                                                {formatAmount(tx.amount, tx.type)}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {tx.refId ? `${tx.refId.substring(0, 12)}...` : "—"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {tx.id.substring(0, 8)}...
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
