import type { Game, Rank } from 'csdm/common/types/counter-strike';
import { db } from '../database';
import { ensureDate } from '../ensure-date';

export type LastPlayersData = {
  steamId: string;
  rank: Rank;
  game: Game;
  name: string;
  winsCount: number;
  lastKnownName: string | null;
  avatar: string | null;
  lastBanDate: Date | null;
  lastMatchDate: Date;
  vacBanCount: number | null;
  gameBanCount: number | null;
  isCommunityBanned: boolean | null;
};

export async function fetchLastPlayersData(steamIds: string[]): Promise<LastPlayersData[]> {
  if (steamIds.length === 0) {
    return [];
  }

  const lastPlayersData = await db
    .selectFrom('players')
    .select([
      'players.steam_id as steamId',
      'players.name as name',
      'players.rank as rank',
      'players.wins_count as winsCount',
    ])
    .leftJoin('steam_accounts', 'steam_accounts.steam_id', 'players.steam_id')
    .leftJoin('steam_account_overrides', 'players.steam_id', 'steam_account_overrides.steam_id')
    .select([
      db.fn.coalesce('steam_account_overrides.name', 'steam_accounts.name').as('lastKnownName'),
      'avatar',
      'last_ban_date as lastBanDate',
      'is_community_banned as isCommunityBanned',
      'vac_ban_count as vacBanCount',
      'game_ban_count as gameBanCount',
      'economy_ban as economyBan',
    ])
    .innerJoin('demos', 'demos.checksum', 'players.match_checksum')
    .select(['demos.date as lastMatchDate', 'demos.game as game'])
    .where('players.steam_id', 'in', steamIds)
    .orderBy('demos.date', 'desc')
    .execute();

  const uniquePlayers = new Map<string, LastPlayersData>();
  for (const row of lastPlayersData) {
    if (!uniquePlayers.has(row.steamId)) {
      uniquePlayers.set(row.steamId, {
        ...row,
        lastMatchDate: ensureDate(row.lastMatchDate),
        lastBanDate: row.lastBanDate ? ensureDate(row.lastBanDate) : null,
      });
    }
  }

  return [...uniquePlayers.values()];
}
