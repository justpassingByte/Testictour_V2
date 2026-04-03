import { IParticipant } from '../types/tournament';
import api from '../lib/apiConfig';

export class ParticipantService {
  static async join(tournamentId: string): Promise<IParticipant> {
    try {
      const response = await api.post(`/tournaments/${tournamentId}/participants`);
      const participant: IParticipant = response.data;
      return participant;
      } catch  {
      console.error('Error during joining tournament:');
      throw new Error('Error during joining tournament');
    }
  }

  static async list(tournamentId: string): Promise<IParticipant[]> {
    try {
      const response = await api.get(`/tournaments/${tournamentId}/participants`);
      console.log("Raw participants response:", response.data);
      const participants: IParticipant[] = response.data.participants;
      return participants;
    } catch  {
      console.error('Error fetching participants:');
      throw new Error('Error fetching participants');
    }
  }

  static async update(participantId: string, data: Partial<IParticipant>): Promise<IParticipant> {
    try {
      const response = await api.put(`/participants/${participantId}`, data);
      const participant: IParticipant = response.data;
      return participant;
    } catch  {
      console.error('Error updating participant:');
      throw new Error('Error updating participant');
    }
  }

  static async remove(participantId: string): Promise<void> {
    try {
      await api.delete(`/participants/${participantId}`);
    } catch  {
      console.error('Error removing participant:');
      throw new Error('Error removing participant');
    }
  }
}

export const getParticipantHistory = async (participantId: string): Promise<IParticipant> => {
  try {
    const response = await api.get(`/participants/${participantId}/history`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch participant history:', error);
    throw error;
  }
}; 