import { sql } from 'kysely';
import { CompetitiveRank } from 'csdm/common/types/counter-strike';
import { db } from 'csdm/node/database/database';
import type { MatchFilters } from '../match/apply-match-filters';
import type { PremierRankHistory } from 'csdm/common/types/charts/premier-rank-history';
import { ensureDate } from '../ensure-date';

export async function fetchPlayerPremierRankHistory(
  steamId: string,
  { startDate, endDate }: MatchFilters,
): Promise<PremierRankHistory[]> {
  let query = db
    .selectFrom('players')
    .select(['rank as rank', 'wins_count as winCount'])
    .innerJoin('demos', 'demos.checksum', 'players.match_checksum')
    .select('demos.date as matchDate')
    .where('steam_id', '=', steamId)
    .where('rank', '>', CompetitiveRank.GlobalElite)
    .orderBy('demos.date', 'asc');

  if (startDate && endDate) {
    query = query.where(sql<boolean>`demos.date between ${startDate} and ${endDate}`);
  }

  const rows = await query.execute();
  const history: PremierRankHistory[] = rows.map((row) => {
    return {
      ...row,
      matchDate: ensureDate(row.matchDate).toISOString(),
    };
  });

  return history;
}
