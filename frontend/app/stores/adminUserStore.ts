
// ... (keep existing imports)
import { create } from "zustand";
import api from "@/app/lib/apiConfig";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
}

export interface ITransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  refId?: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  puuid?: string;
  riotGameName: string;
  riotGameTag: string;
  region: string;
  createdAt: string;
  rank?: string;
  rankUpdatedAt?: string;
  totalMatchesPlayed: number;
  averagePlacement: number;
  topFourRate: number;
  firstPlaceRate: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  lastUpdatedStats?: string;
  transactions?: ITransaction[];
}


export interface ISubscription {
  id: string;
  userId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string;
  features: any;
  monthlyPrice?: number;
  annualPrice?: number;
  autoRenew: boolean;
  createdAt: string;
}

export interface PartnerPlayer {
  id: string;
  username: string;
  email: string;
  riotGameName: string;
  riotGameTag: string;
  totalPoints: number;
  lobbiesPlayed: number;
  lastPlayed: string | Date;
}

export interface AdminPartnerDetail {
  partner: AdminUserDetail;
  stats: {
    totalPlayers: number;
    totalRevenue: number;
    activeLobbies: number;
    totalLobbies: number;
    monthlyRevenue: number;
    totalMatches: number;
    balance: number;
    lobbyStatuses?: {
      WAITING: number;
      IN_PROGRESS: number;
      COMPLETED: number;
    };
  };
  transactions: ITransaction[];
  lobbies: any[];
  tournaments: any[];
  players: PartnerPlayer[];
  subscription?: ISubscription | null;
}

interface AdminUserState {
  users: AdminUser[];
  loading: boolean;
  selectedUserDetail: AdminUserDetail | null;
  selectedPartnerDetail: AdminPartnerDetail | null; // Added
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  roleFilter: string;
  setPagination: (page: number, limit: number) => void;
  setRoleFilter: (role: string) => void;
  fetchUsers: () => Promise<void>;
  fetchUserDetail: (id: string) => Promise<void>;
  fetchPartnerDetail: (id: string) => Promise<void>; // Added
  createUser: (data: { username: string; email: string; password: string; role: string }) => Promise<void>;
  updateUser: (id: string, data: Partial<AdminUserDetail>) => Promise<void>;
  banUser: (id: string) => Promise<void>;
  deposit: (userId: string, amount: number) => Promise<void>;
}

export const useAdminUserStore = create<AdminUserState>((set, get) => ({
  users: [],
  loading: true,
  selectedUserDetail: null,
  selectedPartnerDetail: null,
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  limit: 10,
  roleFilter: "all",
  setPagination: (page, limit) => {
    set({ currentPage: page, limit, loading: true });
    get().fetchUsers();
  },
  setRoleFilter: (role: string) => {
    set({ roleFilter: role, currentPage: 1, loading: true });
    get().fetchUsers();
  },
  fetchUsers: async () => {
    const { currentPage, limit, roleFilter } = get();
    try {
      const params: { page: number; limit: number; role?: string } = {
        page: currentPage,
        limit: limit,
      };
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      const res = await api.get("/admin/users", { params });
      set({
        users: res.data.data,
        loading: false,
        currentPage: res.data.pagination.currentPage,
        totalPages: res.data.pagination.totalPages,
        totalItems: res.data.pagination.totalItems,
        limit: limit,
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      set({ loading: false });
    }
  },
  fetchUserDetail: async (id) => {
    set({ loading: true, selectedUserDetail: null });
    try {
      const res = await api.get(`/admin/users/${id}`);
      set({ selectedUserDetail: res.data, loading: false });
    } catch (error) {
      console.error("Failed to fetch user detail:", error);
      set({ loading: false, selectedUserDetail: null });
    }
  },
  fetchPartnerDetail: async (id) => {
    set({ loading: true, selectedPartnerDetail: null });
    try {
      const res = await api.get(`/admin/partners/${id}`);
      set({ selectedPartnerDetail: res.data, loading: false });
    } catch (error) {
      console.error("Failed to fetch partner detail:", error);
      set({ loading: false, selectedPartnerDetail: null });
    }
  },
  createUser: async (data) => {
    await api.post("/admin/users", data);
    set({ currentPage: 1 });
    await get().fetchUsers();
  },
  updateUser: async (id, data) => {
    set({ loading: true });
    try {
      const res = await api.put(`/admin/users/${id}`, data);
      // Update both stores if applicable, simplistic approach for now
      set({ selectedUserDetail: res.data, loading: false });
      await get().fetchUsers();
      // If we are in partner view, we might want to refresh that too, 
      // but let's assume editing is done on basic user info for now.
    } catch (error) {
      console.error("Failed to update user:", error);
      set({ loading: false });
    }
  },
  banUser: async (id) => {
    await api.post(`/admin/users/${id}/ban`);
    await get().fetchUsers();
  },
  deposit: async (userId, amount) => {
    set({ loading: true });
    try {
      const res = await api.post(`/admin/users/${userId}/deposit`, { amount });
      set({ selectedUserDetail: res.data, loading: false });
      // If it was a partner, we might need to update selectedPartnerDetail balance too
      const currentPartner = get().selectedPartnerDetail;
      if (currentPartner && currentPartner.partner.id === userId) {
        // Refresh partner detail
        await get().fetchPartnerDetail(userId);
      }
    } catch (error) {
      console.error("Failed to deposit:", error);
      set({ loading: false });
      throw error;
    }
  },
}));