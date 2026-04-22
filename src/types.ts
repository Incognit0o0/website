/**
 * Shared types for Stoloto VIP Races
 */

export type GameStatus = 'waiting' | 'starting' | 'racing' | 'finished';
export type RoomTheme = 'horses' | 'f1' | 'space';

export interface Horse {
  id: string;
  name: string;
  image: string;
  color: string;
  baseSpeed: number;
  isBoosted: boolean;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  horseIds: string[]; // horses owned by this player in the specific room
  isBot: boolean;
}

export interface RoomConfig {
  entryFee: number;
  maxPlayers: number;
  commissionRate: number; // e.g., 0.2 for 20%
  boostCost: number;
  rewardPercentage: number; // e.g., 0.8 (after commission)
}

export interface Room {
  id: string;
  name: string;
  theme: RoomTheme;
  config: RoomConfig;
  players: Player[];
  horses: Horse[];
  status: GameStatus;
  timer: number; // seconds left
  baseTimer?: number; // base duration for resets
  winnerHorseId: string | null;
  finishedAt?: number;
  raceLog: { horseId: string; positions: number[] }[]; // detailed movement for visualization
  fairnessHash?: string;
  serverSeed?: string;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  balance: number;
  is_admin: boolean;
  history?: GameHistory[];
}

export interface GameHistory {
  id: string;
  roomName: string;
  winnerName: string;
  winnerId?: string;
  entryFee: number;
  timestamp: string;
  fairnessHash: string;
  serverSeed?: string;
  config?: RoomConfig;
  financials?: {
    totalPool: number;
    commission: number;
    winnerPool: number;
    totalOrganizerTake: number;
  };
  participants?: {
    id: string;
    name: string;
    isBot: boolean;
    horseIds: string[];
    balanceChange: number;
    boostCount: number;
  }[];
  boosts?: {
    horseId: string;
    horseName: string;
    ownerName: string;
  }[];
}
