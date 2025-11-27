export enum Tier {
  ONE = 1,
  TWO = 2,
  THREE = 3
}

export enum PlayerStatus {
  UNKNOWN = 'UNKNOWN',
  IN = 'IN',
  OUT = 'OUT',
  WAITLIST = 'WAITLIST'
}

export interface Player {
  id: string;
  name: string;
  tier: Tier;
  status: PlayerStatus;
  phoneNumber: string;
  email?: string;
  pin?: string;
  timestamp?: number;
  isAdmin?: boolean;
}

export interface PlayerStats {
  id: string;
  name: string;
  gamesPlayed: number;
  tier: Tier;
}

export interface GeneratedTeams {
  teamA: string[];
  teamB: string[];
  strategy: string;
}

export interface GameScore {
  scoreA: number;
  scoreB: number;
  teamA?: string;
  teamB?: string;
  prevScoreA?: number;
  prevScoreB?: number;
  finalScore?: number;
}

export interface AppConfig {
  googleSheetUrl?: string;
  lastSync?: number;
}