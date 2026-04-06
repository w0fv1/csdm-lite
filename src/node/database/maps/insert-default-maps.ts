import type { Transaction } from 'kysely';
import type { Database } from '../schema';
import { getDefaultMaps } from './default-maps';

export async function insertDefaultMaps(transaction: Transaction<Database>) {
  await transaction
    .insertInto('maps')
    .values(getDefaultMaps())
    .onConflict((oc) => oc.columns(['name', 'game']).doNothing())
    .execute();
}
