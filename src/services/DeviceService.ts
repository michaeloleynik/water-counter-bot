import { query } from '../database/db';
import { Device, CreateDeviceDto } from '../models/Device';

export class DeviceService {
  async create(data: CreateDeviceDto): Promise<Device> {
    const result = await query(
      `INSERT INTO devices (name, location, serial_number, description, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.location, data.serial_number, data.description, data.created_by]
    );
    return result.rows[0];
  }

  async findById(id: number): Promise<Device | null> {
    const result = await query(
      'SELECT * FROM devices WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] || null;
  }

  async findBySerialNumber(serialNumber: string): Promise<Device | null> {
    const result = await query(
      'SELECT * FROM devices WHERE serial_number = $1 AND is_active = true',
      [serialNumber]
    );
    return result.rows[0] || null;
  }

  async getAll(): Promise<Device[]> {
    const result = await query(
      'SELECT * FROM devices WHERE is_active = true ORDER BY name ASC'
    );
    return result.rows;
  }

  async update(id: number, data: Partial<CreateDeviceDto>): Promise<Device | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.location !== undefined) {
      fields.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }
    if (data.serial_number !== undefined) {
      fields.push(`serial_number = $${paramIndex++}`);
      values.push(data.serial_number);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE devices SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND is_active = true
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deactivate(id: number): Promise<boolean> {
    const result = await query(
      `UPDATE devices SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async getDeviceStats(deviceId: number) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_readings,
        MAX(reading_date) as last_reading_date,
        MIN(counter_value) as min_value,
        MAX(counter_value) as max_value,
        AVG(counter_value) as avg_value
       FROM readings
       WHERE device_id = $1`,
      [deviceId]
    );
    return result.rows[0];
  }
}

export const deviceService = new DeviceService();
