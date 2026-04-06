import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import type { PlayerResult } from 'csdm/common/types/search/player-result';
import type { PlayersFilter } from 'csdm/common/types/search/players-filter';

export async function searchPlayers({ steamIdOrName, ignoredSteamIds }: PlayersFilter) {
  const likePattern = `%${steamIdOrName.toLowerCase()}%`;
  const query = db
    .selectFrom('players')
    .select(['players.steam_id', 'players.name'])
    .where(({ eb, or }) => {
      return or([eb('players.steam_id', '=', steamIdOrName), sql<boolean>`LOWER(players.name) LIKE ${likePattern}`]);
    })
    .orderBy('players.steam_id')
    .orderBy('players.name');

  const rows = await query.execute();
  const seenSteamIds = new Set<string>();
  const players: PlayerResult[] = [];
  for (const row of rows) {
    if (ignoredSteamIds.includes(row.steam_id) || seenSteamIds.has(row.steam_id)) {
      continue;
    }

    seenSteamIds.add(row.steam_id);
    players.push({
      name: row.name,
      steamId: row.steam_id,
    });

    if (players.length === 20) {
      break;
    }
  }

  return players;
}
