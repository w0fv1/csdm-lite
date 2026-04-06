import type { InfernoPosition } from 'csdm/common/types/inferno-position';
import { db } from 'csdm/node/database/database';
import { infernoPositionRowToInfernoPosition } from './inferno-position-row-to-inferno-position';
import { fillMissingTicks } from 'csdm/common/array/fill-missing-ticks';

export async function fetchInfernoPositions(checksum: string, roundNumber: number) {
  const rows = await db
    .selectFrom('inferno_positions')
    .selectAll()
    .where('match_checksum', '=', checksum)
    .where('round_number', '=', roundNumber)
    .orderBy('tick')
    .execute();
  const uniqueRows = rows.filter((row, index, allRows) => {
    return (
      allRows.findIndex((candidate) => {
        return candidate.tick === row.tick && candidate.unique_id === row.unique_id;
      }) === index
    );
  });
  const infernoPositions: InfernoPosition[] = fillMissingTicks(uniqueRows.map(infernoPositionRowToInfernoPosition));

  return infernoPositions;
}
