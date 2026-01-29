import { BotContext } from '../../middleware/auth';
import { deviceService } from '../../services/DeviceService';
import { readingService } from '../../services/ReadingService';
import { fileHelper } from '../../utils/fileHelper';
import { devicesListKeyboard, backToMenuKeyboard, cancelKeyboard } from '../../utils/keyboards';
import { formatReading } from '../../utils/formatters';

interface SessionData {
  selectedDeviceId?: number;
  counterValue?: number;
  photoPath?: string;
}

const sessions = new Map<number, SessionData>();

export const handleAddReading = async (ctx: BotContext) => {
  if (!ctx.user) return;

  const devices = await deviceService.getAll();

  if (devices.length === 0) {
    await ctx.reply(
      '❌ В системе нет аппаратов.\n\n' +
      (ctx.user.role === 'admin' 
        ? 'Добавьте аппарат через меню "Управление аппаратами".'
        : 'Обратитесь к администратору для добавления аппаратов.'),
      backToMenuKeyboard()
    );
    return;
  }

  sessions.set(ctx.user.telegram_id, {});

  await ctx.reply(
    '📝 *Загрузка показаний*\n\n' +
    'Шаг 1: Выберите аппарат:',
    {
      parse_mode: 'Markdown',
      ...devicesListKeyboard(devices)
    }
  );
};

export const handleDeviceSelection = async (ctx: BotContext, deviceId: number) => {
  if (!ctx.user) return;

  const device = await deviceService.findById(deviceId);
  if (!device) {
    await ctx.answerCbQuery('❌ Аппарат не найден');
    return;
  }

  const session = sessions.get(ctx.user.telegram_id) || {};
  session.selectedDeviceId = deviceId;
  sessions.set(ctx.user.telegram_id, session);

  // Получаем последнее показание для этого аппарата
  const lastReading = await readingService.getLatestReading(deviceId);
  const lastValueText = lastReading 
    ? `\n\n📊 Последнее показание: *${lastReading.counter_value}*`
    : '';

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `✅ Выбран аппарат: *${device.name}*${lastValueText}\n\n` +
    `📝 Шаг 2: Введите текущее показание счетчика:`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

export const handleCounterValue = async (ctx: BotContext, value: string): Promise<boolean> => {
  if (!ctx.user) return false;

  const session = sessions.get(ctx.user.telegram_id);
  if (!session || !session.selectedDeviceId) {
    await ctx.reply('❌ Сначала выберите аппарат.');
    return false;
  }

  const counterValue = parseFloat(value.replace(',', '.'));
  if (isNaN(counterValue) || counterValue < 0) {
    await ctx.reply(
      '❌ Неверное значение. Введите числовое показание счетчика (например: 123.45):',
      cancelKeyboard()
    );
    return false;
  }

  session.counterValue = counterValue;
  sessions.set(ctx.user.telegram_id, session);

  await ctx.reply(
    `✅ Показание принято: *${counterValue}*\n\n` +
    `📷 *Шаг 3: Отправьте фотографию счетчика*\n\n` +
    `⚠️ Важно: отправьте именно фото, а не файл/документ!\n` +
    `Используйте кнопку 📷 (камера) или 📎 (изображение) в Telegram для отправки фото.`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
  
  return true;
};

export const isWaitingForCounterValue = (telegramId: number): boolean => {
  const session = sessions.get(telegramId);
  return session !== undefined && session.selectedDeviceId !== undefined && session.counterValue === undefined;
};

export const isWaitingForPhoto = (telegramId: number): boolean => {
  const session = sessions.get(telegramId);
  return session !== undefined && session.selectedDeviceId !== undefined && session.counterValue !== undefined && session.photoPath === undefined;
};

export const clearSession = (telegramId: number): boolean => {
  return sessions.delete(telegramId);
};

export const handleNonPhotoMessage = async (ctx: BotContext) => {
  if (!ctx.user) return;

  const session = sessions.get(ctx.user.telegram_id);
  if (!session || !session.selectedDeviceId || session.counterValue === undefined) {
    return; // Не наша сессия, игнорируем
  }

  // Определяем тип отправленного сообщения
  let messageType = 'сообщение';
  if (ctx.message) {
    if ('document' in ctx.message) messageType = 'документ';
    else if ('sticker' in ctx.message) messageType = 'стикер';
    else if ('video' in ctx.message) messageType = 'видео';
    else if ('voice' in ctx.message) messageType = 'голосовое сообщение';
    else if ('audio' in ctx.message) messageType = 'аудио';
    else if ('text' in ctx.message) messageType = 'текстовое сообщение';
  }

  // Если пользователь отправил что-то кроме фото, когда ждем фото
  await ctx.reply(
    `❌ *Ожидается фотография!*\n\n` +
    `Вы отправили: ${messageType}\n\n` +
    `📷 Пожалуйста, отправьте *фото* показаний счетчика.\n\n` +
    `💡 *Совет:* Используйте кнопку 📷 (камера) или 📎 (изображение) в Telegram для отправки фото.`,
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

export const handlePhoto = async (ctx: BotContext) => {
  if (!ctx.user || !ctx.message || !('photo' in ctx.message)) return;

  const session = sessions.get(ctx.user.telegram_id);
  if (!session || !session.selectedDeviceId || session.counterValue === undefined) {
    await ctx.reply('❌ Сначала выберите аппарат и введите показание.');
    return;
  }

  try {
    // Получаем файл с максимальным разрешением
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);

    if (!file.file_path) {
      throw new Error('Не удалось получить путь к файлу');
    }

    // Скачиваем файл
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Сохраняем файл
    const photoPath = await fileHelper.saveFile(buffer, 'jpg');

    // Создаем запись о показании
    const reading = await readingService.create({
      device_id: session.selectedDeviceId,
      user_id: ctx.user.id,
      counter_value: session.counterValue,
      photo_path: photoPath,
      notes: 'caption' in ctx.message ? ctx.message.caption : undefined,
      client_timestamp: new Date()
    });

    // Очищаем сессию
    sessions.delete(ctx.user.telegram_id);

    // Получаем полную информацию о показании
    const readingWithDetails = await readingService.findById(reading.id);

    await ctx.reply(
      `✅ *Показание успешно сохранено!*\n\n` +
      formatReading(readingWithDetails || reading),
      {
        parse_mode: 'Markdown',
        ...backToMenuKeyboard()
      }
    );
  } catch (error) {
    console.error('Ошибка при сохранении фото:', error);
    await ctx.reply(
      '❌ Произошла ошибка при сохранении фотографии. Попробуйте еще раз.',
      cancelKeyboard()
    );
  }
};

export const handleMyReadings = async (ctx: BotContext) => {
  if (!ctx.user) return;

  const readings = await readingService.getByUser(ctx.user.id, 10);

  if (readings.length === 0) {
    await ctx.reply(
      '📊 У вас пока нет загруженных показаний.',
      backToMenuKeyboard()
    );
    return;
  }

  let message = `📊 *Ваши последние показания:*\n\n`;
  
  for (const reading of readings) {
    message += `• ${reading.device_name}: *${reading.counter_value}*\n`;
    message += `  📅 ${formatReading(reading).split('\n')[2]}\n\n`;
  }

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    ...backToMenuKeyboard()
  });
};

export const handleCancel = async (ctx: BotContext) => {
  if (!ctx.user) return;

  const hadSession = sessions.has(ctx.user.telegram_id);
  sessions.delete(ctx.user.telegram_id);
  
  if (hadSession) {
    await ctx.answerCbQuery('❌ Загрузка показаний отменена');
    await ctx.editMessageText(
      '❌ Загрузка показаний отменена.\n\nВы можете начать заново или выбрать другое действие.',
      backToMenuKeyboard()
    );
  } else {
    await ctx.answerCbQuery('❌ Операция отменена');
    try {
      await ctx.editMessageText(
        '❌ Операция отменена.',
        backToMenuKeyboard()
      );
    } catch (error) {
      // Если не удалось отредактировать сообщение, отправляем новое
      await ctx.reply(
        '❌ Операция отменена.',
        backToMenuKeyboard()
      );
    }
  }
};
