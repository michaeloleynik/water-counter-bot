export interface Device {
  id: number;
  name: string;
  location?: string;
  serial_number?: string;
  description?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface CreateDeviceDto {
  name: string;
  location?: string;
  serial_number?: string;
  description?: string;
  created_by: number;
}
