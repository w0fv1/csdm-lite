import { db } from 'csdm/node/database/database';
import { grenadePositionRowToGrenadePosition } from './grenade-position-row-to-grenade-position';
import { fillMissingTicks } from 'csdm/common/array/fill-missing-ticks';

export async function fetchGrenadePositions(checksum: string, roundNumber: number) {
  const rows = await db
    .selectFrom('grenade_positions')
    .selectAll()
    .where('match_checksum', '=', checksum)
    .where('round_number', '=', roundNumber)
    .orderBy('tick')
    .execute();
  const uniqueRows = rows.filter((row, index, allRows) => {
    return (
      allRows.findIndex((candidate) => {
        return candidate.tick === row.tick && candidate.projectile_id === row.projectile_id;
      }) === index
    );
  });
  const grenadePositions = fillMissingTicks(uniqueRows.map(grenadePositionRowToGrenadePosition));

  return grenadePositions;
}
