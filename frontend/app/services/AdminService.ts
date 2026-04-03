import api from '../lib/apiConfig';
import { Player } from '../stores/miniTourLobbyStore'; // Assuming Player type is here

export class AdminService {
  static async getAllUsers(searchTerm?: string): Promise<Player[]> {
    try {
      const params: { [key: string]: string } = {};
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await api.get<{
        success: boolean; data: Player[]
}>(`/admin/users`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch all users (admin):', error);
      throw new Error('Failed to fetch all users (admin)');
    }
  }

  // You can add more admin-specific methods here based on admin.routes.ts
  // For example: getUserDetail, createUser, updateUser, banUser, depositToUser, importUsers
} 