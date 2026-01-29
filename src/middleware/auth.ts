import { Context, MiddlewareFn } from 'telegraf';
import { userService } from '../services/UserService';

export interface BotContext extends Context {
  user?: {
    id: number;
    telegram_id: number;
    role: 'admin' | 'employee';
    first_name?: string;
  };
}

export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from) {
    return;
  }

  const user = await userService.findByTelegramId(ctx.from.id);
  
  if (!user || !user.is_active) {
    await ctx.reply(
      '❌ У вас нет доступа к этому боту.\n\n' +
      'Для получения доступа обратитесь к администратору.'
    );
    return;
  }

  ctx.user = {
    id: user.id,
    telegram_id: user.telegram_id,
    role: user.role,
    first_name: user.first_name
  };

  return next();
};

export const adminOnly: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    await ctx.reply('❌ Эта команда доступна только администраторам.');
    return;
  }
  return next();
};
