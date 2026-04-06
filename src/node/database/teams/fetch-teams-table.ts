import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import type { TeamsTableFilter } from './teams-table-filter';
import type { TeamTable } from 'csdm/common/types/team-table';
import { ensureDate } from '../ensure-date';

export async function fetchTeamsTable(filter: TeamsTableFilter): Promise<TeamTable[]> {
  const { count, sum, avg, max } = db.fn;
  let query = db
    .selectFrom('teams')
    .select([
      'teams.name as name',
      count<number>('teams.match_checksum').distinct().as('matchCount'),
      sum<number>('players.kill_count').as('killCount'),
      sum<number>('players.death_count').as('deathCount'),
      sum<number>('players.assist_count').as('assistCount'),
      sum<number>('players.headshot_count').as('headshotCount'),
      sum<number>('three_kill_count').as('threeKillCount'),
      sum<number>('four_kill_count').as('fourKillCount'),
      sum<number>('five_kill_count').as('fiveKillCount'),
      avg<number>('headshot_percentage').as('headshotPercentage'),
      avg<number>('kast').as('kast'),
      sql<number>`(SUM(players.kill_count) * 1.0) / NULLIF(SUM(players.death_count), 0)`.as('killDeathRatio'),
      avg<number>('hltv_rating').as('hltvRating'),
      avg<number>('hltv_rating_2').as('hltvRating2'),
      avg<number>('average_damage_per_round').as('averageDamagePerRound'),
    ])
    .innerJoin('demos', 'demos.checksum', 'teams.match_checksum')
    .select([max('demos.date').as('lastMatchDate')])
    .leftJoin('players', (join) => {
      return join
        .onRef('players.match_checksum', '=', 'teams.match_checksum')
        .onRef('players.team_name', '=', 'teams.name');
    })
    .orderBy('teams.name')
    .groupBy(['teams.name']);

  const { startDate, endDate } = filter;
  if (startDate && endDate) {
    query = query.where(sql<boolean>`demos.date between ${startDate} and ${endDate}`);
  }

  const rows = await query.execute();
  const teams: TeamTable[] = rows.map((row) => {
    return {
      ...row,
      lastMatchDate: ensureDate(row.lastMatchDate).toISOString(),
    };
  });

  return teams;
}
