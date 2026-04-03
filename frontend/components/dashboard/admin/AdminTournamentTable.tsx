import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAdminTournamentStore } from "@/app/stores/adminTournamentStore";

export default function AdminTournamentTable({ onEdit }: { onEdit?: (id: string) => void }) {
  const { tournaments, loading, fetchTournaments, deleteTournament } = useAdminTournamentStore();

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Start Date</th>
            <th className="px-4 py-2 text-left">End Date</th>
            <th className="px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="text-center py-8">Đang tải...</td>
            </tr>
          ) : tournaments.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8">Không có tournament nào</td>
            </tr>
          ) : (
            tournaments.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{t.name}</td>
                <td className="px-4 py-2 capitalize">{t.status}</td>
                <td className="px-4 py-2">{t.startDate}</td>
                <td className="px-4 py-2">{t.endDate}</td>
                <td className="px-4 py-2 text-center space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(t.id)}>
                    Sửa
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteTournament(t.id)}>
                    Xóa
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