"use client";

import { useEffect, useState } from "react";
import { useAdminUserStore } from "@/app/stores/adminUserStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, Search, Filter, Plus, Upload, Download, Loader2 } from "lucide-react";
import PartnerDetailView from "@/app/[locale]/dashboard/admin/components/PartnerDetailView";
import AddUserModal from "@/components/dashboard/admin/AddUserModal";
import UserImportModal from "./UserImportModal";

export default function UserManagementTab() {
  const users = useAdminUserStore((state) => state.users);
  const loading = useAdminUserStore((state) => state.loading);
  const fetchUsers = useAdminUserStore((state) => state.fetchUsers);
  const setRoleFilter = useAdminUserStore((state) => state.setRoleFilter);
  const createUser = useAdminUserStore((state) => state.createUser);
  const banUser = useAdminUserStore((state) => state.banUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const [openAddUser, setOpenAddUser] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);

  useEffect(() => {
    // Force role filter to partner initially or just fetch all
    setRoleFilter("partner");
  }, [setRoleFilter]); // Ensure this only runs once or when setter changes

  const handleCreateUser = async (data: any) => {
    await createUser(data);
    setOpenAddUser(false);
  }

  const handlePartnerClick = (id: string) => {
    setSelectedPartnerId(id);
  };

  const handleBackFromDetail = () => {
    setSelectedPartnerId(null);
  };

  if (selectedPartnerId) {
    return <PartnerDetailView partnerId={selectedPartnerId} onBack={handleBackFromDetail} />;
  }

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      // We are strictly showing partners, but if we wanted to mimic the 'filter' logic:
      // note: our user object in AdminUserStore is simpler than PlayerTabClient's PartnerPlayer
      // so we might not have 'lobbiesPlayed' or 'lastPlayed' here unless we fetch more detail.
      // For now, search is the primary filter.

      return matchesSearch && user.role === 'partner';
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "username") {
        comparison = a.username.localeCompare(b.username);
      } else if (sortBy === "balance") {
        comparison = (a.balance || 0) - (b.balance || 0);
      }
      // Add more sort options if available in AdminUser interface
      return sortOrder === "asc" ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Partners</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Total Partners: {filteredUsers.length}
          </span>
          {/* Disabled per request: Import/Export CSV
          <Button variant="outline" size="sm" onClick={() => setOpenImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          */}
          <Button variant="default" size="sm" onClick={() => setOpenAddUser(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Partner
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>P</AvatarFallback>
            </Avatar>
            Partner List
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Input
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {/* Add more statuses if available in data */}
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
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
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No partners found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={`/placeholder.svg`} />
                          <AvatarFallback>
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div
                            className="font-medium cursor-pointer hover:text-primary transition-colors hover:underline"
                            onClick={() => handlePartnerClick(user.id)}
                          >
                            {user.username}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize"><div className="badge badge-primary badge-outline">{user.role}</div></TableCell>
                    <TableCell>
                      {user.subscriptionPlan ? (
                        <Badge
                          variant={user.subscriptionPlan === 'ENTERPRISE' ? 'default' : 'secondary'}
                          className={`text-xs ${user.subscriptionPlan === 'PRO'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : user.subscriptionPlan === 'ENTERPRISE'
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}
                        >
                          {user.subscriptionPlan}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {user.balance?.toLocaleString()} đ
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => banUser(user.id)}
                      >
                        Ban
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddUserModal
        open={openAddUser}
        onClose={() => setOpenAddUser(false)}
        onCreate={handleCreateUser}
      />
      <UserImportModal
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
      />
    </div>
  );
}