import { BotContext } from '../../middleware/auth';
import { userService } from '../../services/UserService';
import { invitationService } from '../../services/InvitationService';
import { mainMenuKeyboard, persistentKeyboard } from '../../utils/keyboards';

export const handleStart = async (ctx: BotContext) => {
  if (!ctx.from) return;

  const user = await userService.findByTelegramId(ctx.from.id);

  if (user && user.is_active) {
    // Пользователь уже зарегистрирован
    const greeting = user.first_name ? `Привет, ${user.first_name}!` : 'Привет!';
    
    // Сначала отправляем Reply-клавиатуру
    await ctx.reply('Клавиатура навигации активирована', persistentKeyboard());

    await ctx.reply(
      `${greeting}\n\n` +
      `Добро пожаловать в систему учета показаний счетчиков водных аппаратов.\n\n` +
      `Ваша роль: ${user.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}`,
      mainMenuKeyboard(user.role === 'admin')
    );
    return;
  }

  // Проверяем, есть ли код приглашения в команде
  const args = ctx.message && 'text' in ctx.message ? ctx.message.text.split(' ') : [];
  
  if (args.length > 1) {
    const inviteCode = args[1];
    const invitation = await invitationService.findByCode(inviteCode);

    if (!invitation) {
      await ctx.reply('❌ Неверный код приглашения.');
      return;
    }

    if (!(await invitationService.isValid(inviteCode))) {
      await ctx.reply('❌ Этот код приглашения недействителен или истек.');
      return;
    }

    // Регистрируем нового пользователя
    const newUser = await userService.create({
      telegram_id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      role: invitation.role
    });

    await invitationService.markAsUsed(inviteCode, ctx.from.id, ctx.from.username);

    // Активируем Reply-клавиатуру
    await ctx.reply('Клавиатура навигации активирована', persistentKeyboard());

    await ctx.reply(
      `✅ Добро пожаловать!\n\n` +
      `Вы зарегистрированы как ${newUser.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}.\n\n` +
      `Теперь вы можете пользоваться системой.`,
      mainMenuKeyboard(newUser.role === 'admin')
    );
    return;
  }

  // Пользователь не зарегистрирован и нет кода приглашения
  await ctx.reply(
    '❌ У вас нет доступа к этому боту.\n\n' +
    'Для получения доступа обратитесь к администратору за ссылкой-приглашением.'
  );
};

export const handleMenu = async (ctx: BotContext) => {
  if (!ctx.user) return;

  // Отправляем Reply-клавиатуру вместе с меню, чтобы она обновилась/появилась
  await ctx.reply(
    '📋 Главное меню',
    {
      ...persistentKeyboard(),
      ...mainMenuKeyboard(ctx.user.role === 'admin')
    }
  );
};
