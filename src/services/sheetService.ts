import { Player, PlayerStatus, PlayerStats } from '../types';
import { MOCK_PLAYER_STATS } from '../constants';

export const syncRosterFromSheet = async (url: string): Promise<Player[] | null> => {
  try {
    const response = await fetch(url, { method: 'GET' });
    const json = await response.json();
    if (json.status === 'success' && Array.isArray(json.data)) return json.data;
    return null;
  } catch (error) {
    console.error("Failed to fetch roster:", error);
    return null;
  }
};

export const getGameScore = async (url: string): Promise<{scoreA: number, scoreB: number} | null> => {
  if (!url) return { scoreA: 0, scoreB: 0 };
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}action=GET_SCORE`, { method: 'GET' });
    const json = await response.json();
    if (json.status === 'success') return { scoreA: json.scoreA, scoreB: json.scoreB };
    return null;
  } catch (error) {
    return null;
  }
};

export const updateGameScore = async (url: string, scoreA: number, scoreB: number, actorName: string) => {
  if (!url) return;
  await sendPost(url, { action: 'UPDATE_SCORE', scoreA: scoreA, scoreB: scoreB, actor: actorName });
};

export const getPlayerStats = async (url: string): Promise<PlayerStats[] | null> => {
  if (!url) return new Promise((resolve) => { setTimeout(() => resolve(MOCK_PLAYER_STATS), 800); });
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}action=GET_STATS`, { method: 'GET' });
    const json = await response.json();
    if (json.status === 'success' && Array.isArray(json.stats)) return json.stats;
    return null;
  } catch (error) {
    return MOCK_PLAYER_STATS;
  }
};

export const initializeSheet = async (url: string, players: Player[], actorName: string) => {
  await sendPost(url, { action: 'INITIALIZE_OR_SYNC', players: players, actor: actorName });
};

export const updatePlayerStatusOnSheet = async (url: string, playerId: string, status: PlayerStatus, timestamp: number | undefined, actorName: string) => {
  await sendPost(url, { action: 'UPDATE_STATUS', id: playerId, status: status, timestamp: timestamp || Date.now(), actor: actorName });
};

export const createPlayerOnSheet = async (url: string, player: Player, actorName: string) => {
  await sendPost(url, { action: 'CREATE_PLAYER', player: player, actor: actorName });
};

export const updatePlayerDetailsOnSheet = async (url: string, player: Player, actorName: string) => {
  await sendPost(url, { action: 'UPDATE_PLAYER_DETAILS', id: player.id, player: player, actor: actorName });
};

export const deletePlayerOnSheet = async (url: string, playerId: string, actorName: string) => {
  await sendPost(url, { action: 'DELETE_PLAYER', id: playerId, actor: actorName });
};

export const resetWeekOnSheet = async (url: string, actorName: string, shouldArchive: boolean) => {
  await sendPost(url, { action: 'RESET_WEEK', shouldArchive: shouldArchive, actor: actorName });
};

const sendPost = async (url: string, data: any) => {
  try {
    await fetch(url, { method: 'POST', body: JSON.stringify(data), mode: 'no-cors', headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("API Error", error);
    throw error;
  }
};