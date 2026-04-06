import { sql } from 'kysely';
import type { PlayerChartsData } from 'csdm/common/types/charts/player-charts-data';
import { db } from 'csdm/node/database/database';
import { applyMatchFilters, type MatchFilters } from '../match/apply-match-filters';
import { ensureDate } from '../ensure-date';

export async function fetchPlayerChartsData(steamId: string, filters: MatchFilters): Promise<PlayerChartsData[]> {
  let query = db
    .selectFrom('players')
    .select([
      'headshot_percentage as headshotPercentage',
      'average_damage_per_round as averageDamagePerRound',
      'kill_death_ratio as killDeathRatio',
    ])
    .innerJoin('matches', 'matches.checksum', 'players.match_checksum')
    .innerJoin('demos', 'demos.checksum', 'matches.checksum')
    .select('demos.date as matchDate')
    .leftJoin('clutches', function (qb) {
      return qb
        .onRef('clutches.match_checksum', '=', 'players.match_checksum')
        .onRef('players.steam_id', '=', 'clutches.clutcher_steam_id');
    })
    .select([
      sql<number>`ROUND(
        SUM(CASE WHEN clutches.won = 1 THEN 1 ELSE 0 END) * 100.0 /
        CASE WHEN COUNT(clutches.id) > 0 THEN COUNT(clutches.id) ELSE 1 END,
        1
      )`.as('clutchWonPercentage'),
    ])
    .where('steam_id', '=', steamId)
    .groupBy(['headshotPercentage', 'averageDamagePerRound', 'killDeathRatio', 'demos.date'])
    .orderBy('demos.date', 'asc');

  query = applyMatchFilters(query, filters);

  const rows = await query.execute();
  const data: PlayerChartsData[] = rows.map((row) => {
    return {
      ...row,
      matchDate: ensureDate(row.matchDate).toISOString(),
    };
  });

  return data;
}
