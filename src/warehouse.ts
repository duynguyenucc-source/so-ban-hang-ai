import type { ContainerShipment, Lot, PurchaseTicket } from './types';

export function getImportWarehouseRows(lots: Lot[], tickets: PurchaseTicket[]) {
  return lots.map(lot => ({
    lot,
    ticket: tickets.find(ticket => ticket.lotId === lot.id) || null,
    remainingPercent: lot.initialWeight > 0 ? Math.round((lot.currentWeight / lot.initialWeight) * 100) : 0,
  }));
}

export function getExportWarehouseRows(shipments: ContainerShipment[]) {
  return shipments.map(shipment => ({
    shipment,
    totalWeight: shipment.items.reduce((sum, item) => sum + item.weight, 0),
    totalItems: shipment.items.length,
  }));
}
