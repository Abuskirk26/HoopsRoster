import { Player, PlayerStatus, Tier, PlayerStats } from './types';

export const MAX_PLAYERS = 12;

export const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: 'LeBron J.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, isAdmin: true, phoneNumber: '555-555-0101', pin: '1111', email: 'king@hoops.com' },
  { id: '2', name: 'Steph C.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0102', pin: '3030' },
  { id: '3', name: 'Kevin D.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0103', pin: '3535' },
  { id: '4', name: 'Giannis A.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0104', pin: '3434' },
  { id: '5', name: 'Luka D.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0105', pin: '7777' },
  { id: '6', name: 'Nikola J.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0106', pin: '1515' },
  { id: '7', name: 'Jayson T.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0107', pin: '0000' },
  { id: '8', name: 'Joel E.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0108', pin: '2121' },
  { id: '9', name: 'Jimmy B.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0109', pin: '2222' },
  { id: '10', name: 'Kawhi L.', tier: Tier.ONE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0110', pin: '0202' },
  { id: '11', name: 'Paul G.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0111', pin: '1313' },
  { id: '12', name: 'Damian L.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0112', pin: '0000' },
  { id: '13', name: 'Kyrie I.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0113', pin: '1111' },
  { id: '14', name: 'Devin B.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0114', pin: '0101' },
  { id: '15', name: 'Donovan M.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0115', pin: '4545' },
  { id: '16', name: 'Anthony E.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0116', pin: '0505' },
  { id: '17', name: 'Jamal M.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0117', pin: '2727' },
  { id: '18', name: 'DeAaron F.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0118', pin: '0505' },
  { id: '19', name: 'Jaylen B.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0119', pin: '0707' },
  { id: '20', name: 'Trae Y.', tier: Tier.TWO, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0120', pin: '1111' },
  { id: '21', name: 'Zion W.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0121', pin: '1111' },
  { id: '22', name: 'Ja M.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0122', pin: '1111' },
  { id: '23', name: 'LaMelo B.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0123', pin: '1111' },
  { id: '24', name: 'Tyrese H.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0124', pin: '1111' },
  { id: '25', name: 'Paolo B.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0125', pin: '1111' },
  { id: '26', name: 'Cade C.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0126', pin: '1111' },
  { id: '27', name: 'Victor W.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0127', pin: '1111' },
  { id: '28', name: 'Chet H.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0128', pin: '1111' },
  { id: '29', name: 'Scottie B.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0129', pin: '1111' },
  { id: '30', name: 'Evan M.', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: '555-555-0130', pin: '1111' },
];

export const MOCK_PLAYER_STATS: PlayerStats[] = [
  { id: '1', name: 'LeBron J.', gamesPlayed: 42, tier: Tier.ONE },
  { id: '2', name: 'Steph C.', gamesPlayed: 40, tier: Tier.ONE },
  { id: '6', name: 'Nikola J.', gamesPlayed: 39, tier: Tier.ONE },
  { id: '3', name: 'Kevin D.', gamesPlayed: 35, tier: Tier.ONE },
  { id: '11', name: 'Paul G.', gamesPlayed: 31, tier: Tier.TWO },
  { id: '18', name: 'DeAaron F.', gamesPlayed: 28, tier: Tier.TWO },
  { id: '4', name: 'Giannis A.', gamesPlayed: 25, tier: Tier.ONE },
  { id: '21', name: 'Zion W.', gamesPlayed: 15, tier: Tier.THREE },
  { id: '22', name: 'Ja M.', gamesPlayed: 12, tier: Tier.THREE },
  { id: '30', name: 'Evan M.', gamesPlayed: 4, tier: Tier.THREE },
];