import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAdminUserStore } from "@/app/stores/adminUserStore";

export default function AdminUserTable({ onViewDetail }: { onViewDetail?: (id: string) => void }) {
  const { users, loading, fetchUsers, banUser } = useAdminUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Username</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Role</th>
            <th className="px-4 py-2 text-right">Balance</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="text-center py-8">Đang tải...</td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8">Không có user nào</td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">
                  <span
                    className="cursor-pointer hover:underline text-blue-600"
                    onClick={() => onViewDetail?.(user.id)}
                  >
                    {user.username}
                  </span>
                </td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2 capitalize">{user.role}</td>
                <td className="px-4 py-2 text-right">{user.balance?.toLocaleString()} đ</td>
                <td className="px-4 py-2 text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onViewDetail?.(user.id)}>
                    Xem
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => banUser(user.id)}>
                    Ban
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 