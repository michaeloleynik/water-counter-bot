import { BotContext } from '../../middleware/auth';
import { deviceService } from '../../services/DeviceService';
import { readingService } from '../../services/ReadingService';
import { devicesListKeyboard, dateRangeKeyboard, backToMenuKeyboard, reportActionsKeyboard, reportFormatKeyboard } from '../../utils/keyboards';
import { formatDate, formatDateShort } from '../../utils/formatters';
import { fileHelper } from '../../utils/fileHelper';

interface ReportSession {
  deviceId?: number;
}

const reportSessions = new Map<number, ReportSession>();

export const handleCancelReport = async (ctx: BotContext) => {
  if (!ctx.user) return;

  reportSessions.delete(ctx.user.telegram_id);
  
  await ctx.answerCbQuery('❌ Создание отчета отменено');
  await ctx.editMessageText(
    '❌ Создание отчета отменено.\n\nВы можете начать заново или выбрать другое действие.',
    backToMenuKeyboard()
  );
};

export const handleReports = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const devices = await deviceService.getAll();

  if (devices.length === 0) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '❌ В системе нет аппаратов для создания отчетов.',
      backToMenuKeyboard()
    );
    return;
  }

  reportSessions.set(ctx.user.telegram_id, {});

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '📈 *Отчеты*\n\n' +
    'Выберите аппарат для просмотра текущего состояния и последних показаний:',
    {
      parse_mode: 'Markdown',
      ...devicesListKeyboard(devices)
    }
  );
};

export const handleReportDeviceSelection = async (ctx: BotContext, deviceId: number) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const device = await deviceService.findById(deviceId);
  if (!device) {
    await ctx.answerCbQuery('❌ Аппарат не найден');
    return;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🔧 Аппарат: *${device.name}*\n\n` +
    `Выберите формат выгрузки отчета:`,
    {
      parse_mode: 'Markdown',
      ...reportFormatKeyboard(deviceId)
    }
  );
};

export const handleReportText = async (ctx: BotContext, deviceId: number) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const endDate = now;

  await generateReport(ctx, deviceId, startDate, endDate);
};

export const handleDateRange = async (ctx: BotContext, range: string) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const session = reportSessions.get(ctx.user.telegram_id);
  if (!session || !session.deviceId) {
    await ctx.answerCbQuery('❌ Сначала выберите аппарат');
    return;
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      await ctx.answerCbQuery('❌ Неверный период');
      return;
  }

  await generateReport(ctx, session.deviceId, startDate, endDate);
  reportSessions.delete(ctx.user.telegram_id);
};

import { pdfService } from '../../services/PdfService';

export const handlePdfReport = async (ctx: BotContext, deviceId: number) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  try {
    await ctx.answerCbQuery('⏳ Подготовка PDF...');
    
    const device = await deviceService.findById(deviceId);
    if (!device) return;

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const readings = await readingService.getByDeviceAndDateRange(deviceId, startDate, now);

    const filePath = await pdfService.generateDeviceReport(device, readings, startDate, now);
    
    await ctx.replyWithDocument({ source: filePath, filename: `Отчет_${device.name}.pdf` });
  } catch (error) {
    console.error('Ошибка PDF:', error);
    await ctx.reply('❌ Не удалось создать PDF отчет.');
  }
};

async function generateReport(
  ctx: BotContext,
  deviceId: number,
  startDate: Date,
  endDate: Date
) {
  await ctx.answerCbQuery('⏳ Генерация отчета...');

  const device = await deviceService.findById(deviceId);
  if (!device) {
    await ctx.editMessageText('❌ Аппарат не найден', backToMenuKeyboard());
    return;
  }

  const readings = await readingService.getByDeviceAndDateRange(deviceId, startDate, endDate);

  if (readings.length === 0) {
    await ctx.editMessageText(
      `📈 *Отчет*\n\n` +
      `🔧 Аппарат: ${device.name}\n` +
      `📅 Период: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}\n\n` +
      `❌ За выбранный период показаний нет.`,
      {
        parse_mode: 'Markdown',
        ...backToMenuKeyboard()
      }
    );
    return;
  }

  // Формируем отчет
  let message = `📈 *Отчет по показаниям*\n\n`;
  message += `🔧 Аппарат: *${device.name}*\n`;
  if (device.location) {
    message += `📍 Расположение: ${device.location}\n`;
  }
  message += `📅 Период: ${formatDateShort(startDate)} - ${formatDateShort(endDate)}\n`;
  message += `📊 Всего показаний: *${readings.length}*\n\n`;

  // Статистика
  const values = readings.map(r => r.counter_value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const consumption = maxValue - minValue;

  message += `📉 Минимум: ${minValue}\n`;
  message += `📈 Максимум: ${maxValue}\n`;
  message += `📊 Среднее: ${avgValue.toFixed(2)}\n`;
  message += `💧 Расход: ${consumption.toFixed(2)}\n\n`;

  message += `*Последние показания:*\n\n`;

  // Показываем последние 5 показаний
  const recentReadings = readings.slice(0, 5);
  for (const reading of recentReadings) {
    message += `• ${formatDate(reading.reading_date)}\n`;
    message += `  Значение: *${reading.counter_value}*\n`;
    message += `  Сотрудник: ${reading.user_name}\n\n`;
  }

  if (readings.length > 5) {
    message += `_...и еще ${readings.length - 5} показаний_\n\n`;
  }

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...reportActionsKeyboard(deviceId)
  });

  // Отправляем фотографии последних показаний отдельными сообщениями с подписями
  for (const reading of recentReadings) {
    const photoPath = fileHelper.getFullPath(reading.photo_path);
    if (fileHelper.fileExists(reading.photo_path)) {
      try {
        await ctx.replyWithPhoto(
          { source: photoPath },
          {
            caption: `📷 *Показание:* ${reading.counter_value}\n` +
                     `📅 *Дата:* ${formatDate(reading.reading_date)}\n` +
                     `👤 *Сотрудник:* ${reading.user_name}`,
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error(`Ошибка при отправке фото для показания ${reading.id}:`, error);
      }
    }
  }
}
