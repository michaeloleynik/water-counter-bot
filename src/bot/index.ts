import { Telegraf, session } from 'telegraf';
import { BotContext, authMiddleware, adminOnly } from '../middleware/auth';
import { handleStart, handleMenu } from './handlers/start';
import { backToMenuKeyboard } from '../utils/keyboards';
import {
  handleAddReading,
  handleDeviceSelection,
  handleCounterValue,
  handlePhoto,
  handleMyReadings,
  handleCancel,
  isWaitingForCounterValue,
  isWaitingForPhoto,
  handleNonPhotoMessage,
  clearSession
} from './handlers/readings';
import {
  handleManageDevices,
  handleAddDevice,
  handleDeviceInput,
  handleListDevices,
  cancelDeviceCreation,
  isCreatingDevice
} from './handlers/devices';
import {
  handleManageUsers,
  handleInviteEmployee,
  handleInviteAdmin,
  handleListUsers,
  handleActiveInvitations
} from './handlers/users';
import {
  handleReports,
  handleReportDeviceSelection,
  handleDateRange,
  handleCancelReport
} from './handlers/reports';

export class Bot {
  private bot: Telegraf<BotContext>;
  private userStates: Map<number, string>;

  constructor(token: string) {
    this.bot = new Telegraf<BotContext>(token);
    this.userStates = new Map();
    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    this.bot.use(session());
  }

  private setupHandlers() {
    // Команда /start доступна всем
    this.bot.command('start', handleStart);

    // Команда /menu требует авторизации
    this.bot.command('menu', authMiddleware, async (ctx) => {
      // Очищаем любые активные сессии при возврате в меню
      if (ctx.user) {
        clearSession(ctx.user.telegram_id);
        this.userStates.delete(ctx.user.telegram_id);
      }
      await handleMenu(ctx);
    });

    // Команда /cancel для отмены текущей операции
    this.bot.command('cancel', authMiddleware, async (ctx) => {
      if (ctx.user) {
        const hadSession = clearSession(ctx.user.telegram_id);
        this.userStates.delete(ctx.user.telegram_id);
        
        if (hadSession) {
          await ctx.reply(
            '❌ Загрузка показаний отменена.\n\nВы можете начать заново или выбрать другое действие.',
            backToMenuKeyboard()
          );
        } else {
          await ctx.reply(
            '✅ Нет активных операций для отмены.\n\nИспользуйте /menu для открытия главного меню.',
            backToMenuKeyboard()
          );
        }
      }
    });

    // Обработчики callback_query требуют авторизации
    this.bot.action('back_to_menu', authMiddleware, handleMenu);
    this.bot.action('cancel', authMiddleware, async (ctx) => {
      cancelDeviceCreation(ctx);
      await handleCancel(ctx);
    });

    // Показания
    this.bot.action('add_reading', authMiddleware, handleAddReading);
    this.bot.action('my_readings', authMiddleware, handleMyReadings);
    this.bot.action(/^device_(\d+)$/, authMiddleware, async (ctx) => {
      const deviceId = parseInt(ctx.match[1]);
      const state = this.userStates.get(ctx.user!.telegram_id);
      
      if (state === 'report_device_selection') {
        await handleReportDeviceSelection(ctx, deviceId);
      } else {
        await handleDeviceSelection(ctx, deviceId);
      }
    });

    // Управление аппаратами (только админы)
    this.bot.action('manage_devices', authMiddleware, adminOnly, handleManageDevices);
    this.bot.action('add_device', authMiddleware, adminOnly, handleAddDevice);
    this.bot.action('list_devices', authMiddleware, adminOnly, handleListDevices);

    // Управление пользователями (только админы)
    this.bot.action('manage_users', authMiddleware, adminOnly, handleManageUsers);
    this.bot.action('invite_employee', authMiddleware, adminOnly, handleInviteEmployee);
    this.bot.action('invite_admin', authMiddleware, adminOnly, handleInviteAdmin);
    this.bot.action('list_users', authMiddleware, adminOnly, handleListUsers);
    this.bot.action('active_invitations', authMiddleware, adminOnly, handleActiveInvitations);
    this.bot.action(/^delete_user_(\d+)$/, authMiddleware, adminOnly, async (ctx) => {
      const userId = parseInt(ctx.match[1]);
      // Обработчик будет добавлен в users.ts
      const { handleDeleteUser } = await import('./handlers/users');
      await handleDeleteUser(ctx, userId);
    });

    // Отчеты (только админы)
    this.bot.action('reports', authMiddleware, adminOnly, async (ctx) => {
      this.userStates.set(ctx.user!.telegram_id, 'report_device_selection');
      await handleReports(ctx);
    });
    this.bot.action('cancel_report', authMiddleware, adminOnly, async (ctx) => {
      this.userStates.delete(ctx.user!.telegram_id);
      await handleCancelReport(ctx);
    });
    this.bot.action(/^range_(.+)$/, authMiddleware, adminOnly, async (ctx) => {
      const range = ctx.match[1];
      await handleDateRange(ctx, range);
      this.userStates.delete(ctx.user!.telegram_id);
    });

    this.bot.action(/^report_text_(\d+)$/, authMiddleware, adminOnly, async (ctx) => {
      const deviceId = parseInt(ctx.match[1]);
      const { handleReportText } = await import('./handlers/reports');
      await handleReportText(ctx, deviceId);
    });

    this.bot.action(/^report_pdf_(\d+)$/, authMiddleware, adminOnly, async (ctx) => {
      const deviceId = parseInt(ctx.match[1]);
      const { handlePdfReport } = await import('./handlers/reports');
      await handlePdfReport(ctx, deviceId);
    });

    this.bot.action(/^pdf_report_(\d+)$/, authMiddleware, adminOnly, async (ctx) => {
      const deviceId = parseInt(ctx.match[1]);
      const { handlePdfReport } = await import('./handlers/reports');
      await handlePdfReport(ctx, deviceId);
    });

    // Обработка фотографий
    this.bot.on('photo', authMiddleware, handlePhoto);

    // Обработка текстовых сообщений
    this.bot.on('text', authMiddleware, async (ctx) => {
      if (!ctx.message || !('text' in ctx.message) || !ctx.user) return;
      
      const text = ctx.message.text;

      // Обработка Reply-кнопок
      if (text === '📋 Меню') {
        await handleMenu(ctx);
        return;
      }
      if (text === '📊 Мои показания') {
        await handleMyReadings(ctx);
        return;
      }
      if (text === '❓ Помощь') {
        await ctx.reply(
          '📖 *Справка*\n\n' +
          '• Используйте кнопку "Загрузить показания" для отправки новых данных.\n' +
          '• Админы могут управлять аппаратами и пользователями через меню.\n' +
          '• Если бот не реагирует, используйте /start.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Проверяем, ждем ли мы фото (пользователь отправил текст вместо фото)
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
        return;
      }

      // Проверяем, ждет ли пользователь ввода показания счетчика
      if (isWaitingForCounterValue(ctx.user.telegram_id)) {
        await handleCounterValue(ctx, text);
        return;
      }

      // Проверяем, создает ли пользователь аппарат
      if (isCreatingDevice(ctx.user.telegram_id)) {
        await handleDeviceInput(ctx, text);
        return;
      }

      // По умолчанию - неизвестная команда
      await ctx.reply(
        '❓ Неизвестная команда. Используйте /menu для открытия главного меню.'
      );
    });

    // Обработка документов (когда ждем фото)
    this.bot.on('document', authMiddleware, async (ctx) => {
      if (!ctx.user) return;
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
      }
    });

    // Обработка стикеров (когда ждем фото)
    this.bot.on('sticker', authMiddleware, async (ctx) => {
      if (!ctx.user) return;
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
      }
    });

    // Обработка видео (когда ждем фото)
    this.bot.on('video', authMiddleware, async (ctx) => {
      if (!ctx.user) return;
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
      }
    });

    // Обработка голосовых сообщений (когда ждем фото)
    this.bot.on('voice', authMiddleware, async (ctx) => {
      if (!ctx.user) return;
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
      }
    });

    // Обработка аудио (когда ждем фото)
    this.bot.on('audio', authMiddleware, async (ctx) => {
      if (!ctx.user) return;
      if (isWaitingForPhoto(ctx.user.telegram_id)) {
        await handleNonPhotoMessage(ctx);
      }
    });

    // Обработка ошибок
    this.bot.catch((err, ctx) => {
      console.error('Ошибка в боте:', err);
      ctx.reply('❌ Произошла ошибка. Попробуйте еще раз или обратитесь к администратору.');
    });
  }

  // Устанавливаем состояние пользователя
  setUserState(userId: number, state: string) {
    this.userStates.set(userId, state);
  }

  // Получаем состояние пользователя
  getUserState(userId: number): string | undefined {
    return this.userStates.get(userId);
  }

  // Очищаем состояние пользователя
  clearUserState(userId: number) {
    this.userStates.delete(userId);
  }

  async launch() {
    // Установка команд для кнопки "Меню" слева от строки ввода
    await this.bot.telegram.setMyCommands([
      { command: 'menu', description: 'Главное меню' },
      { command: 'start', description: 'Перезапустить бота' },
      { command: 'cancel', description: 'Отменить текущую операцию' }
    ]);

    await this.bot.launch();
    console.log('✅ Бот запущен!');
  }

  async stop() {
    await this.bot.stop();
    console.log('⏹️  Бот остановлен');
  }
}
