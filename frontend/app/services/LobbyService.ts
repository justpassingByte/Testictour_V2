import { ILobby } from '../types/tournament';
import api from '../lib/apiConfig';

export class LobbyService {
  static async list(roundId: string): Promise<ILobby[]> {
    try {
      const response = await api.get(`/rounds/${roundId}/lobbies`);
      const lobbies: ILobby[] = response.data;
      return lobbies;
      } catch  {
      console.error('Error fetching lobbies:');
      throw new Error('Error fetching lobbies');
    }
  }

  static async create(roundId: string, data: { name: string; participants: string[] }): Promise<ILobby> {
    try {
      const response = await api.post(`/rounds/${roundId}/lobbies`, data);
      const lobby: ILobby = response.data;
      return lobby;
      } catch  {
      console.error('Error creating lobby:');
      throw new Error('Error creating lobby');
    }
  }
} 