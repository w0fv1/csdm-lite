import { db } from 'csdm/node/database/database';
import { chickenPositionRowToChickenPosition } from './chicken-position-row-to-chicken-position';
import { fillMissingTicks } from 'csdm/common/array/fill-missing-ticks';

export async function fetchChickenPositions(checksum: string, roundNumber: number) {
  const rows = await db
    .selectFrom('chicken_positions')
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

  const positions = fillMissingTicks(uniqueRows.map(chickenPositionRowToChickenPosition));

  return positions;
}
