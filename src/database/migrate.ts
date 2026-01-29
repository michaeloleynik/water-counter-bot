import fs from 'fs';
import path from 'path';
import { query, closePool } from './db';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  try {
    console.log('🚀 Начало миграций базы данных...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Выполняем SQL скрипт
    await query(schema);

    console.log('✅ Миграции успешно выполнены');

    // Создаем первого администратора, если указан в .env
    const adminTelegramId = process.env.DEFAULT_ADMIN_TELEGRAM_ID;
    if (adminTelegramId) {
      const result = await query(
        `INSERT INTO users (telegram_id, role, first_name) 
         VALUES ($1, 'admin', 'Администратор')
         ON CONFLICT (telegram_id) DO NOTHING
         RETURNING id`,
        [adminTelegramId]
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Создан администратор с Telegram ID: ${adminTelegramId}`);
      } else {
        console.log(`ℹ️  Администратор с Telegram ID ${adminTelegramId} уже существует`);
      }
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграций:', error);
    await closePool();
    process.exit(1);
  }
}

runMigrations();
