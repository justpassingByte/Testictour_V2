import api from '../lib/apiConfig';
import { Player } from '../stores/miniTourLobbyStore'; // Assuming Player type is here

export class PartnerService {
  static async getUsersByReferrer(referrer: string, searchTerm?: string): Promise<Player[]> {
    try {
      const params: { [key: string]: string } = { referrer };
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await api.get<{
        success: boolean; data: Player[]
      }>(`/admin/users/by-referrer`, { params }); // Using the existing admin route for now
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch users by referrer (partner):', error);
      throw new Error('Failed to fetch users by referrer (partner)');
    }
  }

  static async getPartnerPlayers(): Promise<Player[]> {
    try {
      const response = await api.get<{
        success: boolean; data: Player[]
      }>('/partner/players');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch partner players:', error);
      throw new Error('Failed to fetch partner players');
    }
  }
}