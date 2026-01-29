import Dexie, { Table } from 'dexie';

// Интерфейсы для локального хранилища
export interface LocalReading {
  id?: number;
  deviceId: number;
  deviceName: string;
  counterValue: number;
  photoBase64: string;
  notes?: string;
  timestamp: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  serverReadingId?: number;
  errorMessage?: string;
}

export interface LocalDevice {
  id: number;
  name: string;
  location?: string;
  serialNumber?: string;
  description?: string;
  lastSyncedAt?: Date;
}

export interface LocalUser {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: 'admin' | 'employee';
  lastSyncedAt?: Date;
}

// База данных Dexie
export class WaterCounterDB extends Dexie {
  readings!: Table<LocalReading, number>;
  devices!: Table<LocalDevice, number>;
  users!: Table<LocalUser, number>;

  constructor() {
    super('WaterCounterDB');
    
    this.version(1).stores({
      readings: '++id, deviceId, timestamp, syncStatus',
      devices: 'id, name',
      users: 'telegramId'
    });
  }
}

export const db = new WaterCounterDB();
