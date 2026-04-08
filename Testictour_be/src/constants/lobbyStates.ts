export const LOBBY_STATE = {
  WAITING:            'WAITING',
  READY_CHECK:        'READY_CHECK',
  GRACE_PERIOD:       'GRACE_PERIOD',
  STARTING:           'STARTING',
  PLAYING:            'PLAYING',
  FINISHED:           'FINISHED',
  PAUSED:             'PAUSED',
  ADMIN_INTERVENTION: 'ADMIN_INTERVENTION',
} as const;

export type LobbyState = typeof LOBBY_STATE[keyof typeof LOBBY_STATE];

// All state transitions must go through this validator
export function assertValidState(state: string): asserts state is LobbyState {
  if (!Object.values(LOBBY_STATE).includes(state as LobbyState)) {
    throw new Error(`Invalid lobby state: "${state}"`);
  }
}

export const PHASE_DURATIONS_MS: Record<LobbyState, number> = {
  WAITING:            120_000,
  READY_CHECK:        300_000,  // 5 min before ADMIN_INTERVENTION
  GRACE_PERIOD:        60_000,
  STARTING:            10_000,
  PLAYING:          3_600_000,  // 1 hour max
  FINISHED:                 0,
  PAUSED:                   0,  // dynamic — set to remainingDurationOnPause
  ADMIN_INTERVENTION: 900_000,  // 15 min auto-timeout
};

// Returns the next state in the happy path
export function getNextState(state: LobbyState): LobbyState {
  const transitions: Partial<Record<LobbyState, LobbyState>> = {
    WAITING:      'READY_CHECK',
    READY_CHECK:  'ADMIN_INTERVENTION', // default timeout path (no quorum)
    GRACE_PERIOD: 'STARTING',
    STARTING:     'PLAYING',
    // PLAYING → FINISHED is handled by fetchMatchData job
  };
  return transitions[state] ?? 'ADMIN_INTERVENTION';
}
