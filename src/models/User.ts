export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'employee';
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface CreateUserDto {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'employee';
}
