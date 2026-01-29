import { BotContext } from '../../middleware/auth';
import { userService } from '../../services/UserService';
import { invitationService } from '../../services/InvitationService';
import { userManagementKeyboard, backToMenuKeyboard, userListActionsKeyboard, backToManagementKeyboard, userManagementWithDeleteKeyboard } from '../../utils/keyboards';
import { formatUser } from '../../utils/formatters';

export const handleManageUsers = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '👥 *Управление пользователями*\n\n' +
    'Здесь вы можете приглашать новых сотрудников и управлять существующими пользователями.',
    {
      parse_mode: 'Markdown',
      ...userManagementKeyboard()
    }
  );
};

export const handleDeleteUser = async (ctx: BotContext, userId: number) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const userToDelete = await userService.findById(userId);
  if (!userToDelete) {
    await ctx.answerCbQuery('❌ Пользователь не найден');
    return;
  }

  if (userToDelete.telegram_id === ctx.user.telegram_id) {
    await ctx.answerCbQuery('❌ Вы не можете удалить самого себя');
    return;
  }

  await userService.deactivateUser(userId);
  await ctx.answerCbQuery('✅ Пользователь удален');
  
  // Обновляем список
  await handleListUsers(ctx);
};

export const handleInviteEmployee = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const invitation = await invitationService.create(ctx.user.id, 'employee');

  const inviteLink = `https://t.me/${ctx.botInfo?.username}?start=${invitation.invite_code}`;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `✅ *Ссылка-приглашение для сотрудника создана!*\n\n` +
    `Отправьте эту ссылку новому сотруднику:\n\n` +
    `\`${inviteLink}\`\n\n` +
    `⏰ Ссылка действительна 7 дней.`,
    {
      parse_mode: 'Markdown',
      ...backToManagementKeyboard('users')
    }
  );
};

export const handleInviteAdmin = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const invitation = await invitationService.create(ctx.user.id, 'admin');

  const inviteLink = `https://t.me/${ctx.botInfo?.username}?start=${invitation.invite_code}`;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `✅ *Ссылка-приглашение для администратора создана!*\n\n` +
    `Отправьте эту ссылку новому администратору:\n\n` +
    `\`${inviteLink}\`\n\n` +
    `⏰ Ссылка действительна 7 дней.\n\n` +
    `⚠️ *Внимание:* Администраторы имеют полный доступ к системе!`,
    {
      parse_mode: 'Markdown',
      ...backToManagementKeyboard('users')
    }
  );
};

export const handleListUsers = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const users = await userService.getAllUsers();

  if (users.length === 0) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '👥 В системе пока нет пользователей.',
      userListActionsKeyboard()
    );
    return;
  }

  let message = `👥 *Список пользователей (${users.length}):*\n\n` +
    `Нажмите "Удалить" рядом с пользователем для деактивации доступа.`;

  await ctx.answerCbQuery();
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...userManagementWithDeleteKeyboard(users)
  });
};

export const handleActiveInvitations = async (ctx: BotContext) => {
  if (!ctx.user || ctx.user.role !== 'admin') return;

  const invitations = await invitationService.getActiveInvitations(ctx.user.id);

  if (invitations.length === 0) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '🔗 У вас нет активных приглашений.',
      backToManagementKeyboard('users')
    );
    return;
  }

  let message = `🔗 *Активные приглашения (${invitations.length}):*\n\n`;

  for (const inv of invitations) {
    const inviteLink = `https://t.me/${ctx.botInfo?.username}?start=${inv.invite_code}`;
    message += `• Роль: ${inv.role === 'admin' ? '👑 Администратор' : '👷 Сотрудник'}\n`;
    message += `  Ссылка: \`${inviteLink}\`\n`;
    if (inv.expires_at) {
      const expiresDate = new Date(inv.expires_at);
      message += `  Истекает: ${expiresDate.toLocaleDateString('ru-RU')}\n`;
    }
    message += `\n`;
  }

  await ctx.answerCbQuery();
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...backToManagementKeyboard('users')
  });
};
