import { Loader2 } from "lucide-react";

export default function LobbyLoading() {
  return (
    <div className="container py-8 flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground w-full">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold">Connecting to Lobby...</h2>
      <p className="text-sm">Fetching real-time state and players data</p>
    </div>
  );
}
