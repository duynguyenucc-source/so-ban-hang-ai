import type {
  AIAnomalyAlert,
  Buyer,
  ContainerShipment,
  DebtTransaction,
  Lot,
  ProcessingRecord,
  PurchaseTicket,
  Seller,
} from './types';

export const LOCAL_DATABASE_KEY = 'so-vua-dua-ai-local-database-v1';

export interface LocalDatabase {
  version: 1;
  savedAt: string;
  sellers: Seller[];
  buyers: Buyer[];
  lots: Lot[];
  tickets: PurchaseTicket[];
  processingRecords: ProcessingRecord[];
  shipments: ContainerShipment[];
  transactions: DebtTransaction[];
  alerts: AIAnomalyAlert[];
}

type LocalDatabaseInput = Omit<LocalDatabase, 'version' | 'savedAt'>;

function hasArrays(value: any) {
  return [
    'sellers',
    'buyers',
    'lots',
    'tickets',
    'processingRecords',
    'shipments',
    'transactions',
    'alerts',
  ].every(key => Array.isArray(value?.[key]));
}

export function createInitialLocalDatabase(input: LocalDatabaseInput): LocalDatabase {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    ...input,
  };
}

export function serializeLocalDatabase(db: LocalDatabase) {
  return JSON.stringify({ ...db, savedAt: new Date().toISOString() });
}

export function parseLocalDatabase(raw: string | null): LocalDatabase | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !hasArrays(parsed)) return null;
    return parsed as LocalDatabase;
  } catch {
    return null;
  }
}
