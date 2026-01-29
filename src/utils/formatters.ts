import { format } from 'date-fns';

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd.MM.yyyy HH:mm');
};

export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd.MM.yyyy');
};

export const formatReading = (reading: any): string => {
  let text = `📊 *Показание счетчика*\n\n`;
  text += `🔢 Значение: *${reading.counter_value}*\n`;
  text += `📅 Дата: ${formatDate(reading.reading_date)}\n`;
  
  if (reading.device_name) {
    text += `🔧 Аппарат: ${escapeMarkdown(reading.device_name)}\n`;
  }
  
  if (reading.device_location) {
    text += `📍 Расположение: ${escapeMarkdown(reading.device_location)}\n`;
  }
  
  if (reading.user_name) {
    text += `👤 Сотрудник: ${escapeMarkdown(reading.user_name)}\n`;
  }
  
  if (reading.notes) {
    text += `\n📝 Примечание: ${escapeMarkdown(reading.notes)}`;
  }
  
  return text;
};

export const formatDevice = (device: any): string => {
  let text = `🔧 *${escapeMarkdown(device.name)}*\n\n`;
  
  if (device.serial_number) {
    text += `🔖 Серийный номер: ${escapeMarkdown(device.serial_number)}\n`;
  }
  
  if (device.location) {
    text += `📍 Расположение: ${escapeMarkdown(device.location)}\n`;
  }
  
  if (device.description) {
    text += `📄 Описание: ${escapeMarkdown(device.description)}\n`;
  }
  
  text += `📅 Добавлен: ${formatDate(device.created_at)}`;
  
  return text;
};

export const formatUser = (user: any): string => {
  let text = `👤 `;
  
  if (user.first_name) {
    text += escapeMarkdown(user.first_name);
  }
  
  if (user.last_name) {
    text += ` ${escapeMarkdown(user.last_name)}`;
  }
  
  if (user.username) {
    text += ` (@${escapeMarkdown(user.username)})`;
  }
  
  text += `\n🎭 Роль: ${user.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}\n`;
  text += `📅 Регистрация: ${formatDate(user.created_at)}`;
  
  return text;
};

export const escapeMarkdown = (text: string): string => {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};
