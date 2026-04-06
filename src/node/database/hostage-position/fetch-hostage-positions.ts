import { db } from 'csdm/node/database/database';
import { hostagePositionRowToHostagePosition } from './hostage-position-row-to-hostage-position';
import { fillMissingTicks } from 'csdm/common/array/fill-missing-ticks';

export async function fetchHostagePositions(checksum: string, roundNumber: number) {
  const rows = await db
    .selectFrom('hostage_positions')
    .selectAll()
    .where('match_checksum', '=', checksum)
    .where('round_number', '=', roundNumber)
    .orderBy('tick')
    .execute();
  const uniqueRows = rows.filter((row, index, allRows) => {
    return (
      allRows.findIndex((candidate) => {
        return candidate.tick === row.tick && candidate.x === row.x && candidate.y === row.y && candidate.z === row.z;
      }) === index
    );
  });

  const positions = fillMissingTicks(uniqueRows.map(hostagePositionRowToHostagePosition));

  return positions;
}
