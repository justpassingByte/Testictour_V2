import { create } from "zustand";
import api from "@/app/lib/apiConfig";

export interface AdminTournament {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  // Thêm các trường khác nếu cần
}

interface AdminTournamentState {
  tournaments: AdminTournament[];
  loading: boolean;
  fetchTournaments: () => Promise<void>;
  addTournament: (data: Partial<AdminTournament>) => Promise<void>;
  updateTournament: (id: string, data: Partial<AdminTournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
}

export const useAdminTournamentStore = create<AdminTournamentState>((set, get) => ({
  tournaments: [],
  loading: false,
  fetchTournaments: async () => {
    set({ loading: true });
    try {
      const res = await api.get("/admin/tournaments");
      set({ tournaments: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addTournament: async (data) => {
    await api.post("/admin/tournaments", data);
    await get().fetchTournaments();
  },
  updateTournament: async (id, data) => {
    await api.put(`/admin/tournaments/${id}`, data);
    await get().fetchTournaments();
  },
  deleteTournament: async (id) => {
    await api.delete(`/admin/tournaments/${id}`);
    await get().fetchTournaments();
  },
})); 