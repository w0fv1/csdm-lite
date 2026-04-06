import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';
import type { SearchFilter } from 'csdm/common/types/search/search-filter';
import type { RoundResult } from 'csdm/common/types/search/round-result';
import { roundRowToRound } from '../rounds/round-row-to-round';
import { ensureDate } from '../ensure-date';

type Filter = SearchFilter;

export async function searchRounds({
  steamIds,
  mapNames,
  startDate,
  endDate,
  demoSources,
  roundTagIds,
  matchTagIds,
}: Filter) {
  let query = db
    .selectFrom('rounds')
    .selectAll('rounds')
    .distinct()
    .innerJoin('matches', 'matches.checksum', 'rounds.match_checksum')
    .innerJoin('demos', 'demos.checksum', 'matches.checksum')
    .leftJoin('round_comments as rc', function (qb) {
      return qb.onRef('rounds.match_checksum', '=', 'rc.match_checksum').onRef('rounds.number', '=', 'rc.number');
    })
    .select(['demos.map_name', 'demos.date', 'matches.demo_path', 'demos.game', 'rc.comment'])
    .leftJoin('round_tags', function (qb) {
      return qb
        .onRef('round_tags.checksum', '=', 'rounds.match_checksum')
        .onRef('round_tags.round_number', '=', 'rounds.number');
    })
    .where('rounds.id', 'in', (qb) => {
      let roundTagsQuery = qb
        .selectFrom('rounds')
        .distinct()
        .select('rounds.id')
        .leftJoin('round_tags', function (qb) {
          return qb
            .onRef('round_tags.checksum', '=', 'rounds.match_checksum')
            .onRef('round_tags.round_number', '=', 'rounds.number');
        });

      if (roundTagIds.length > 0) {
        roundTagsQuery = roundTagsQuery.where('round_tags.tag_id', 'in', roundTagIds);
      }

      return roundTagsQuery;
    })
    .select('round_tags.tag_id as tagId')
    .$if(matchTagIds.length > 0, (qb) => {
      return qb
        .leftJoin('checksum_tags', 'checksum_tags.checksum', 'matches.checksum')
        .where('checksum_tags.tag_id', 'in', matchTagIds)
        .groupBy([
          'rounds.id',
          'demos.map_name',
          'demos.date',
          'matches.demo_path',
          'demos.game',
          'rc.comment',
          'round_tags.tag_id',
        ]);
    })
    .$if(steamIds.length > 0, (qb) => {
      return qb
        .leftJoin('players', 'players.match_checksum', 'matches.checksum')
        .where('players.steam_id', 'in', steamIds);
    })
    .orderBy('demos.date', 'desc')
    .orderBy('rounds.match_checksum')
    .orderBy('rounds.number')
    .orderBy('rounds.start_tick')
    .groupBy([
      'rounds.id',
      'demos.map_name',
      'demos.date',
      'matches.demo_path',
      'demos.game',
      'rc.comment',
      'round_tags.tag_id',
    ]);

  if (mapNames.length > 0) {
    query = query.where('demos.map_name', 'in', mapNames);
  }

  if (startDate && endDate) {
    query = query.where(sql<boolean>`demos.date between ${startDate} and ${endDate}`);
  }

  if (demoSources.length > 0) {
    query = query.where('demos.source', 'in', demoSources);
  }

  const rows = await query.execute();
  const roundsById = new Map<string, RoundResult>();
  for (const row of rows) {
    const roundId = String(row.id);
    const existingRound = roundsById.get(roundId);
    if (existingRound) {
      if (row.tagId !== null) {
        const tagId = String(row.tagId);
        if (!existingRound.tagIds.includes(tagId)) {
          existingRound.tagIds.push(tagId);
        }
      }
      continue;
    }

    roundsById.set(roundId, {
      ...roundRowToRound(row, row.tagId === null ? [] : [String(row.tagId)]),
      mapName: row.map_name,
      date: ensureDate(row.date).toISOString(),
      demoPath: row.demo_path,
      game: row.game,
      comment: row.comment ?? '',
    });
  }

  const rounds = [...roundsById.values()];

  return rounds;
}
