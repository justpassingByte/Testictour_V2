import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import LobbyPageClient from './LobbyPageClient';
import { ILobbyStateSnapshot } from '@/app/types/tournament';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

async function fetchLobbyState(lobbyId: string, token?: string): Promise<ILobbyStateSnapshot | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/lobbies/${lobbyId}/state`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function fetchFullLobby(lobbyId: string, token?: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/lobbies/${lobbyId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    console.log(`fetchFullLobby status: ${res.status} for ${lobbyId}`);
    if (!res.ok) {
      const text = await res.text();
      console.log(`fetchFullLobby error response:`, text);
      return null;
    }
    const json = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error(`fetchFullLobby exception:`, error);
    return null;
  }
}

interface LobbyPageProps {
  params: { id: string; lobbyId: string };
}

export default async function LobbyPage({ params }: LobbyPageProps) {
  const { id: tournamentId, lobbyId } = params;

  // Pull token from cookie for SSR auth
  const cookieStore = cookies();
  const token = cookieStore.get('auth-token')?.value;

  const [initialState, lobbyData] = await Promise.all([
    fetchLobbyState(lobbyId, token),
    fetchFullLobby(lobbyId, token),
  ]);

  if (!initialState && !lobbyData) {
    notFound();
  }

  // Fallback map just in case components still use it temporarily
  const participantMap = Object.fromEntries(
    (lobbyData?.participantDetails ?? []).map((p: any) => [p.id, p.username ?? 'Unknown'])
  );

  return (
    <LobbyPageClient
      lobbyId={lobbyId}
      tournamentId={tournamentId}
      initialState={initialState}
      lobbyData={lobbyData}
      participantMap={participantMap}
    />
  );
}
