import { BotContext } from '../../middleware/auth';
import { deviceService } from '../../services/DeviceService';
import { deviceManagementKeyboard, backToMenuKeyboard, cancelKeyboard, deviceListActionsKeyboard } from '../../utils/keyboards';
import { formatDevice } from '../../utils/formatters';

interface DeviceSession {
  step: 'name' | 'location' | 'serial' | 'description';
  name?: string;
  location?: string;
  serial_number?: string;
  description?: string;
}

const deviceSessions = new Map<number, DeviceSession>();

export const handleManageDevices = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🔧 *Управление аппаратами*\n\n' +
    'Здесь вы можете добавлять новые аппараты и управлять существующими.',
    {
      parse_mode: 'Markdown',
      ...deviceManagementKeyboard()
    }
  );
};

export const handleAddDevice = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  deviceSessions.set(ctx.user.telegram_id, { step: 'name' });

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '➕ *Добавление нового аппарата*\n\n' +
    '📝 Шаг 1: Введите название аппарата:',
    {
      parse_mode: 'Markdown',
      ...cancelKeyboard()
    }
  );
};

export const handleDeviceInput = async (ctx: BotContext, text: string): Promise<boolean> => {
  if (!ctx.user || ctx.user.role !== 'admin') return false;

  const session = deviceSessions.get(ctx.user.telegram_id);
  if (!session) return false;

  switch (session.step) {
    case 'name':
      session.name = text;
      session.step = 'location';
      deviceSessions.set(ctx.user.telegram_id, session);
      await ctx.reply(
        `✅ Название: *${text}*\n\n` +
        `📝 Шаг 2: Введите местоположение аппарата (или отправьте "-" для пропуска):`,
        {
          parse_mode: 'Markdown',
          ...cancelKeyboard()
        }
      );
      return true;

    case 'location':
      if (text !== '-') {
        session.location = text;
      }
      session.step = 'serial';
      deviceSessions.set(ctx.user.telegram_id, session);
      await ctx.reply(
        `📝 Шаг 3: Введите серийный номер (или отправьте "-" для пропуска):`,
        cancelKeyboard()
      );
      return true;

    case 'serial':
      if (text !== '-') {
        // Проверяем уникальность серийного номера
        const existing = await deviceService.findBySerialNumber(text);
        if (existing) {
          await ctx.reply(
            '❌ Аппарат с таким серийным номером уже существует. Введите другой серийный номер:',
            cancelKeyboard()
          );
          return false;
        }
        session.serial_number = text;
      }
      session.step = 'description';
      deviceSessions.set(ctx.user.telegram_id, session);
      await ctx.reply(
        `📝 Шаг 4: Введите описание аппарата (или отправьте "-" для пропуска):`,
        cancelKeyboard()
      );
      return true;

    case 'description':
      if (text !== '-') {
        session.description = text;
      }

      // Создаем аппарат
      try {
        const device = await deviceService.create({
          name: session.name!,
          location: session.location,
          serial_number: session.serial_number,
          description: session.description,
          created_by: ctx.user.id
        });

        deviceSessions.delete(ctx.user.telegram_id);

        await ctx.reply(
          `✅ *Аппарат успешно добавлен!*\n\n` +
          formatDevice(device),
          {
            parse_mode: 'Markdown',
            ...backToMenuKeyboard()
          }
        );
      } catch (error) {
        console.error('Ошибка при создании аппарата:', error);
        await ctx.reply(
          '❌ Произошла ошибка при создании аппарата. Попробуйте еще раз.',
          backToMenuKeyboard()
        );
        deviceSessions.delete(ctx.user.telegram_id);
        return true;
      }
      return true;
  }
  
  return false;
};

export const isCreatingDevice = (telegramId: number): boolean => {
  return deviceSessions.has(telegramId);
};

export const handleListDevices = async (ctx: BotContext) => {
  if (!ctx.user) return;

  const devices = await deviceService.getAll();

  if (devices.length === 0) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '📋 В системе пока нет аппаратов.',
      backToMenuKeyboard()
    );
    return;
  }

  let message = `📋 *Список аппаратов (${devices.length}):*\n\n`;

  for (const device of devices) {
    message += `🔧 *${device.name}*\n`;
    if (device.location) {
      message += `📍 ${device.location}\n`;
    }
    if (device.serial_number) {
      message += `🔖 S/N: ${device.serial_number}\n`;
    }

    // Получаем статистику по аппарату
    const stats = await deviceService.getDeviceStats(device.id);
    if (stats.total_readings > 0) {
      message += `📊 Показаний: ${stats.total_readings}\n`;
      message += `📈 Диапазон: ${stats.min_value} - ${stats.max_value}\n`;
    }
    message += `\n`;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...deviceListActionsKeyboard()
  });
};

export const cancelDeviceCreation = (ctx: BotContext) => {
  if (ctx.user) {
    deviceSessions.delete(ctx.user.telegram_id);
  }
};
