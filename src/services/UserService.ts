import { query } from '../database/db';
import { User, CreateUserDto } from '../models/User';

export class UserService {
  async findByTelegramId(telegramId: number): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateUserDto): Promise<User> {
    // Сначала проверяем, не существует ли уже пользователь
    const existingUser = await this.findByTelegramId(data.telegram_id);
    
    if (existingUser) {
      // Если пользователь существует, но деактивирован - реактивируем
      if (!existingUser.is_active) {
        console.log(`Реактивация пользователя ${data.telegram_id} с ролью ${data.role}`);
        const result = await query(
          `UPDATE users 
           SET is_active = true, 
               role = $1,
               username = $2,
               first_name = $3,
               last_name = $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE telegram_id = $5
           RETURNING *`,
          [
            data.role,
            data.username,
            data.first_name,
            data.last_name,
            data.telegram_id
          ]
        );
        return result.rows[0];
      }
      // Если пользователь активен - возвращаем его
      console.log(`Пользователь ${data.telegram_id} уже существует и активен`);
      return existingUser;
    }
    
    // Создаем нового пользователя
    console.log(`Создание нового пользователя ${data.telegram_id} с ролью ${data.role}`);
    const result = await query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.telegram_id, data.username, data.first_name, data.last_name, data.role]
    );
    return result.rows[0];
  }

  async updateRole(telegramId: number, role: 'admin' | 'employee'): Promise<User | null> {
    const result = await query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2
       RETURNING *`,
      [role, telegramId]
    );
    return result.rows[0] || null;
  }

  async isAdmin(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return user?.role === 'admin' && user.is_active;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await query(
      'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async deactivateUser(id: number): Promise<boolean> {
    const result = await query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  async reactivateUser(telegramId: number, role: 'admin' | 'employee'): Promise<User> {
    const result = await query(
      `UPDATE users 
       SET is_active = true, 
           role = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE telegram_id = $2
       RETURNING *`,
      [role, telegramId]
    );
    return result.rows[0];
  }
}

export const userService = new UserService();
