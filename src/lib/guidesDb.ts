import Dexie, { Table } from 'dexie';

export interface GuideMetadata {
  guideNumber: string; // NE0000963 (PK)
  client?: string;
  rif?: string;
  address?: string;
  phone?: string;
  product?: string;
  productName?: string; // Pego Gris/Blanco/Premium
  quantity?: number;
  date?: string; // YYYY-MM-DD
  driverName?: string;
  driverId?: string;
  vehicleBrand?: string;
  vehiclePlate?: string;
  rawText?: string;
  createdAt: number;
}

class GuidesDatabase extends Dexie {
  guides!: Table<GuideMetadata, string>;
  constructor() {
    super('gyc_guides');
    this.version(1).stores({
      guides: '&guideNumber, client, date, productName',
    });
  }
}

export const guidesDb = new GuidesDatabase();

export async function saveGuideMetadata(data: GuideMetadata) {
  await guidesDb.guides.put(data);
}

export async function getGuideMetadata(guideNumber: string) {
  return guidesDb.guides.get(guideNumber);
}

export async function listGuideMetadata() {
  return guidesDb.guides.toArray();
}

export async function deleteGuideMetadata(guideNumber: string) {
  await guidesDb.guides.delete(guideNumber);
}

export async function clearAllGuideMetadata() {
  await guidesDb.guides.clear();
}