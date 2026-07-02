import assert from 'node:assert/strict';
import { createInitialLocalDatabase, parseLocalDatabase, serializeLocalDatabase } from './localDatabase';
import {
  initialAlerts,
  initialBuyers,
  initialDebtTransactions,
  initialLots,
  initialProcessingRecords,
  initialSellers,
  initialShipments,
  initialTickets,
} from './initialData';

const db = createInitialLocalDatabase({
  sellers: initialSellers,
  buyers: initialBuyers,
  lots: initialLots,
  tickets: initialTickets,
  processingRecords: initialProcessingRecords,
  shipments: initialShipments,
  transactions: initialDebtTransactions,
  alerts: initialAlerts,
});

assert.equal(db.version, 1);
assert.equal(db.sellers.length, initialSellers.length);
assert.equal(db.tickets[0].id, initialTickets[0].id);

const serialized = serializeLocalDatabase(db);
const parsed = parseLocalDatabase(serialized);

assert.equal(parsed?.version, 1);
assert.equal(parsed?.lots[0].id, initialLots[0].id);
assert.equal(parseLocalDatabase('bad json'), null);
assert.equal(parseLocalDatabase(JSON.stringify({ version: 1, sellers: [] })), null);
