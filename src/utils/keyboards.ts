import { Markup } from 'telegraf';

export const mainMenuKeyboard = (isAdmin: boolean) => {
  const buttons = [
    [Markup.button.webApp('📱 Открыть Mini App', process.env.WEBAPP_URL || 'https://your-mini-app-url.com')],
    [Markup.button.callback('📝 Загрузить в боте', 'add_reading')],
    [Markup.button.callback('📊 Мои показания', 'my_readings')],
  ];

  if (isAdmin) {
    buttons.push(
      [
        Markup.button.callback('🔧 Аппараты', 'manage_devices'),
        Markup.button.callback('👥 Пользователи', 'manage_users')
      ],
      [
        Markup.button.callback('📈 Отчеты', 'reports'),
        Markup.button.callback('📋 Все аппараты', 'list_devices')
      ]
    );
  }

  return Markup.inlineKeyboard(buttons);
};

export const reportFormatKeyboard = (deviceId: number) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💬 Текст в чат', `report_text_${deviceId}`),
      Markup.button.callback('📄 PDF файл', `report_pdf_${deviceId}`)
    ],
    [Markup.button.callback('◀️ Назад к списку', 'reports')]
  ]);
};

export const devicesListKeyboard = (devices: Array<{ id: number; name: string; location?: string }>, showBackButton: boolean = false) => {
  const buttons = devices.map(device => [
    Markup.button.callback(
      `${device.name}${device.location ? ` (${device.location})` : ''}`,
      `device_${device.id}`
    )
  ]);

  if (showBackButton) {
    buttons.push([Markup.button.callback('◀️ Назад', 'back_to_menu')]);
  }

  return Markup.inlineKeyboard(buttons);
};

export const deviceManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить', 'add_device'),
      Markup.button.callback('📋 Список', 'list_devices')
    ],
    [Markup.button.callback('◀️ В главное меню', 'back_to_menu')]
  ]);
};

export const userManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Сотрудник', 'invite_employee'),
      Markup.button.callback('👑 Админ', 'invite_admin')
    ],
    [
      Markup.button.callback('📋 Список', 'list_users'),
      Markup.button.callback('🔗 Приглашения', 'active_invitations')
    ],
    [Markup.button.callback('◀️ В главное меню', 'back_to_menu')]
  ]);
};

export const backToMenuKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('◀️ В главное меню', 'back_to_menu')]
  ]);
};

export const cancelKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('❌ Отменить', 'cancel'),
      Markup.button.callback('🏠 В меню', 'back_to_menu')
    ]
  ]);
};

export const dateRangeKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Сегодня', 'range_today'),
      Markup.button.callback('📅 Вчера', 'range_yesterday')
    ],
    [
      Markup.button.callback('📆 Неделя', 'range_week'),
      Markup.button.callback('📆 Месяц', 'range_month')
    ],
    [
      Markup.button.callback('❌ Отменить', 'cancel_report'),
      Markup.button.callback('🏠 В меню', 'back_to_menu')
    ]
  ]);
};

export const deviceListActionsKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Добавить аппарат', 'add_device'),
      Markup.button.callback('🔧 Управление', 'manage_devices')
    ],
    [Markup.button.callback('🏠 В главное меню', 'back_to_menu')]
  ]);
};

export const userListActionsKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Пригласить', 'invite_employee'),
      Markup.button.callback('👥 Управление', 'manage_users')
    ],
    [Markup.button.callback('🏠 В главное меню', 'back_to_menu')]
  ]);
};

export const backToManagementKeyboard = (type: 'devices' | 'users') => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('◀️ Назад', type === 'devices' ? 'manage_devices' : 'manage_users'),
      Markup.button.callback('🏠 В меню', 'back_to_menu')
    ]
  ]);
};

export const persistentKeyboard = () => {
  return Markup.keyboard([
    ['📋 Меню', '📊 Мои показания'],
    ['❓ Помощь']
  ]).resize();
};

export const userManagementWithDeleteKeyboard = (users: any[]) => {
  const buttons = users.map(user => [
    Markup.button.callback(`👤 ${user.first_name} ${user.last_name || ''}`, `view_user_${user.id}`),
    Markup.button.callback('🗑 Удалить', `delete_user_${user.id}`)
  ]);
  
  buttons.push([Markup.button.callback('◀️ Назад', 'manage_users')]);
  
  return Markup.inlineKeyboard(buttons);
};

export const reportActionsKeyboard = (deviceId: number) => {
  return Markup.inlineKeyboard([
    [Markup.button.callback('◀️ Назад к отчетам', 'reports')]
  ]);
};
