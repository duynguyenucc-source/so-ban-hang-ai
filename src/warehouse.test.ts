import assert from 'node:assert/strict';
import { getExportWarehouseRows, getImportWarehouseRows } from './warehouse';
import { initialLots, initialShipments, initialTickets } from './initialData';

const importRows = getImportWarehouseRows(initialLots, initialTickets);

assert.equal(importRows.length, initialLots.length);
assert.equal(importRows[0].ticket?.lotId, importRows[0].lot.id);

const exportRows = getExportWarehouseRows(initialShipments);

assert.equal(exportRows.length, initialShipments.length);
assert.equal(exportRows[0].totalWeight, initialShipments[0].items.reduce((sum, item) => sum + item.weight, 0));
