export interface Reading {
  id: number;
  device_id: number;
  user_id: number;
  counter_value: number;
  photo_path: string;
  notes?: string;
  reading_date: Date;
  created_at: Date;
  sync_status: 'pending' | 'synced' | 'failed';
  client_timestamp?: Date;
}

export interface CreateReadingDto {
  device_id: number;
  user_id: number;
  counter_value: number;
  photo_path: string;
  notes?: string;
  client_timestamp?: Date;
}

export interface ReadingWithDetails extends Reading {
  device_name?: string;
  device_location?: string;
  user_name?: string;
}
