import dotenv from 'dotenv';
import { Bot } from './bot';
import { closePool } from './database/db';
import { startServer } from './server';

dotenv.config();

async function main() {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    console.error('❌ Ошибка: BOT_TOKEN не указан в .env файле');
    process.exit(1);
  }

  console.log('🚀 Запуск приложения...');

  // Запускаем API сервер (для Mini App)
  const server = startServer();

  // Запускаем бота
  const bot = new Bot(botToken);

  // Обработка сигналов завершения
  const shutdown = async () => {
    console.log('\n⏹️  Завершение работы...');
    
    // Останавливаем бота
    await bot.stop();
    
    // Закрываем сервер
    server.close(() => {
      console.log('🌐 API сервер остановлен');
    });
    
    // Закрываем пул подключений к БД
    await closePool();
    
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  try {
    await bot.launch();
    console.log('✅ Бот успешно запущен и готов к работе!');
    console.log('📝 Нажмите Ctrl+C для остановки');
  } catch (error) {
    console.error('❌ Ошибка при запуске бота:', error);
    server.close();
    await closePool();
    process.exit(1);
  }
}

main();
