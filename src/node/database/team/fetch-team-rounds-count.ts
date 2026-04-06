import { sql } from 'kysely';
import { TeamNumber } from 'csdm/common/types/counter-strike';
import { db } from '../database';
import type { TeamFilters } from './team-filters';
import { applyMatchFilters } from '../match/apply-match-filters';

type RoundCount = {
  totalCount: number;
  roundCountAsCt: number;
  roundCountAsT: number;
};

export async function fetchTeamRoundCount({ name, ...filters }: TeamFilters): Promise<RoundCount> {
  const { count } = db.fn;
  let query = db
    .selectFrom('rounds')
    .select([
      count<number>('rounds.id').as('totalCount'),
      sql<number>`SUM(CASE
        WHEN (
          (rounds.team_a_name = teams.name AND rounds.team_a_side = ${TeamNumber.CT}) OR
          (rounds.team_b_name = teams.name AND rounds.team_b_side = ${TeamNumber.CT})
        ) THEN 1
        ELSE 0
      END)`.as('roundCountAsCt'),
      sql<number>`SUM(CASE
        WHEN (
          (rounds.team_a_name = teams.name AND rounds.team_a_side = ${TeamNumber.T}) OR
          (rounds.team_b_name = teams.name AND rounds.team_b_side = ${TeamNumber.T})
        ) THEN 1
        ELSE 0
      END)`.as('roundCountAsT'),
    ])
    .innerJoin('matches', 'matches.checksum', 'rounds.match_checksum')
    .innerJoin('demos', 'demos.checksum', 'matches.checksum')
    .innerJoin('teams', 'teams.match_checksum', 'rounds.match_checksum')
    .where((eb) => {
      return eb('teams.name', '=', name).or('teams.name', '=', name);
    });

  query = applyMatchFilters(query, filters);

  const row = await query.executeTakeFirst();

  if (!row) {
    return {
      totalCount: 0,
      roundCountAsCt: 0,
      roundCountAsT: 0,
    };
  }

  return row;
}
