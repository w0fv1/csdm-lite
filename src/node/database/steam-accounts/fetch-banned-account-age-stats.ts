import { db } from 'csdm/node/database/database';
import { ensureDate } from '../ensure-date';

export async function fetchBannedAccountAgeStats(ignoreBanBeforeFirstSeen: boolean) {
  let query = db
    .selectFrom('steam_accounts')
    .select(['steam_accounts.creation_date as creationDate'])
    .where('steam_accounts.last_ban_date', 'is not', null)
    .where('steam_accounts.creation_date', 'is not', null)
    .leftJoin('players', 'players.steam_id', 'steam_accounts.steam_id')
    .leftJoin('demos', 'demos.checksum', 'players.match_checksum');

  if (ignoreBanBeforeFirstSeen) {
    const { ref } = db.dynamic;
    query = query.whereRef('steam_accounts.last_ban_date', '>=', ref('demos.date'));
  }

  const rows = await query.execute();
  const timestamps = rows.map((row) => ensureDate(row.creationDate).getTime()).sort((left, right) => left - right);

  if (timestamps.length === 0) {
    return {
      average: null,
      median: null,
    };
  }

  const averageTimestamp = timestamps.reduce((sum, timestamp) => sum + timestamp, 0) / timestamps.length;
  const middleIndex = Math.floor(timestamps.length / 2);
  const medianTimestamp =
    timestamps.length % 2 === 0 ? (timestamps[middleIndex - 1] + timestamps[middleIndex]) / 2 : timestamps[middleIndex];

  return {
    average: new Date(averageTimestamp).toISOString(),
    median: new Date(medianTimestamp).toISOString(),
  };
}
