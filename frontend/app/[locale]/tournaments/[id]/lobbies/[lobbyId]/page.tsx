import { cookies } from 'next/headers';
import Link from 'next/link';
import LobbyPageClient from './LobbyPageClient';
import { ILobbyStateSnapshot } from '@/app/types/tournament';

// SSR: prefer BACKEND_URL (internal Docker hostname), fallback to INTERNAL_BACKEND_URL (strip /api), then public URL
const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.INTERNAL_BACKEND_URL?.replace(/\/api$/, '')) ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

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

  // Graceful 404: show informative message instead of generic Next.js 404
  // This happens when lobbies are deleted during phase reshuffling or when auth expires
  if (!initialState && !lobbyData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground">Lobby không còn tồn tại</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lobby này có thể đã bị xoá hoặc được tái phân bổ khi giải đấu chuyển sang vòng/giai đoạn tiếp theo.
            Vui lòng quay lại trang giải đấu để xem bảng đấu mới nhất.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/tournaments/${tournamentId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Về trang giải đấu
            </Link>
          </div>
        </div>
      </div>
    );
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
