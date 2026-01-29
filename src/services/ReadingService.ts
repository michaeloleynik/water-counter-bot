import { query } from '../database/db';
import { Reading, CreateReadingDto, ReadingWithDetails } from '../models/Reading';

export class ReadingService {
  async create(data: CreateReadingDto): Promise<Reading> {
    const result = await query(
      `INSERT INTO readings (device_id, user_id, counter_value, photo_path, notes, client_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.device_id,
        data.user_id,
        data.counter_value,
        data.photo_path,
        data.notes,
        data.client_timestamp || new Date()
      ]
    );
    return result.rows[0];
  }

  async findById(id: number): Promise<Reading | null> {
    const result = await query(
      'SELECT * FROM readings WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getByDevice(deviceId: number, limit: number = 100): Promise<ReadingWithDetails[]> {
    const result = await query(
      `SELECT 
        r.*,
        d.name as device_name,
        d.location as device_location,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
       FROM readings r
       JOIN devices d ON r.device_id = d.id
       JOIN users u ON r.user_id = u.id
       WHERE r.device_id = $1
       ORDER BY r.reading_date DESC
       LIMIT $2`,
      [deviceId, limit]
    );
    return result.rows;
  }

  async getByDeviceAndDateRange(
    deviceId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ReadingWithDetails[]> {
    const result = await query(
      `SELECT 
        r.*,
        d.name as device_name,
        d.location as device_location,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
       FROM readings r
       JOIN devices d ON r.device_id = d.id
       JOIN users u ON r.user_id = u.id
       WHERE r.device_id = $1 
         AND r.reading_date >= $2 
         AND r.reading_date <= $3
       ORDER BY r.reading_date DESC`,
      [deviceId, startDate, endDate]
    );
    return result.rows;
  }

  async getByUser(userId: number, limit: number = 50): Promise<ReadingWithDetails[]> {
    const result = await query(
      `SELECT 
        r.*,
        d.name as device_name,
        d.location as device_location,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
       FROM readings r
       JOIN devices d ON r.device_id = d.id
       JOIN users u ON r.user_id = u.id
       WHERE r.user_id = $1
       ORDER BY r.reading_date DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  async getAllReadings(limit: number = 100): Promise<ReadingWithDetails[]> {
    const result = await query(
      `SELECT 
        r.*,
        d.name as device_name,
        d.location as device_location,
        u.first_name || ' ' || COALESCE(u.last_name, '') as user_name
       FROM readings r
       JOIN devices d ON r.device_id = d.id
       JOIN users u ON r.user_id = u.id
       ORDER BY r.reading_date DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getLatestReading(deviceId: number): Promise<Reading | null> {
    const result = await query(
      `SELECT * FROM readings 
       WHERE device_id = $1 
       ORDER BY reading_date DESC 
       LIMIT 1`,
      [deviceId]
    );
    return result.rows[0] || null;
  }

  async getByDeviceWithFilters(
    deviceId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ReadingWithDetails[]> {
    if (startDate && endDate) {
      return this.getByDeviceAndDateRange(
        deviceId,
        new Date(startDate),
        new Date(endDate)
      );
    }
    return this.getByDevice(deviceId, 100);
  }

  async updateSyncStatus(id: number, status: 'pending' | 'synced' | 'failed'): Promise<void> {
    await query(
      'UPDATE readings SET sync_status = $1 WHERE id = $2',
      [status, id]
    );
  }
}

export const readingService = new ReadingService();
