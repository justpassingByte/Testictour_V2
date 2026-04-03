export interface IUser {
  id: string;
  username: string;
  email: string;
  role: string;
  puuid?: string;
  riotGameName?: string;
  riotGameTag?: string;
  region: string;
  createdAt: Date;
  level?: number;
}

export interface IPlayerProfile extends IUser {
  // Assuming these types for now. You might need to define them more accurately.
  tournaments: any[];
  matches: any[];
  stats: Record<string, any>;
  achievements: any[];
  lastActive: Date;
  joinDate: Date;
} 