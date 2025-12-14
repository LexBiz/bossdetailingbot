import { Markup } from 'telegraf';
import { getMessages, formatDate } from '../helpers/utils.js';
import { query } from '../helpers/db.js';

function isAdmin(ctx) {
  // Админом считается только тот, кто ввёл верный пароль в этом чате
  return Boolean(ctx.session && ctx.session.isAdmin);
}

function adminMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 ЗАЯВКИ', 'admin_menu_bookings')]
  ]);
}

async function sendLastBookings(ctx) {
  const lang = 'ru';
  const m = getMessages(lang);
  const res = await query(
    'SELECT b.*, u.name, u.phone, u.phone_verified FROM bookings b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.created_at DESC LIMIT 20',
    []
  );
  if (!res.rows.length) {
    await ctx.reply(m.admin.noBookings);
    return;
  }
  for (const b of res.rows) {
    const statusText = m.statuses[b.status] || b.status;
    const phoneStatus = b.phone_verified ? m.booking.phoneStatusVerified : m.booking.phoneStatusUnverified;
    const text = m.booking.adminBookingTemplate
      .replace('{{id}}', b.id.toString())
      .replace('{{name}}', b.name || '—')
      .replace('{{phone}}', b.phone || '—')
      .replace('{{phoneStatus}}', phoneStatus)
      .replace('{{carClass}}', b.car_class)
      .replace('{{category}}', b.service_category)
      .replace('{{service}}', b.service_name)
      .replace('{{date}}', formatDate(b.visit_date))
      .replace('{{created}}', formatDate(b.created_at))
      .replace('{{comment}}', b.comment || '—')
      .replace('{{status}}', statusText);

    await ctx.reply(text, {
      parse_mode: 'Markdown'
    });
  }
}

async function sendTodayBookings(ctx) {
  const lang = 'ru';
  const m = getMessages(lang);
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const res = await query(
    'SELECT b.*, u.name, u.phone FROM bookings b LEFT JOIN users u ON u.id = b.user_id WHERE b.visit_date BETWEEN $1 AND $2 ORDER BY b.visit_date ASC',
    [start, end]
  );
  if (!res.rows.length) {
    await ctx.reply(m.admin.noBookings);
    return;
  }
  const lines = res.rows.map((b) => {
    const status = m.statuses[b.status] || b.status;
    return `#${b.id} – ${formatDate(b.visit_date)} – ${b.service_category} / ${b.service_name} – ${b.car_class} – ${status} – ${b.name || '-'} (${b.phone || '-'})`;
  });
  await ctx.reply(`*${m.admin.todayTitle}*\n\n${lines.join('\n')}`, {
    parse_mode: 'Markdown'
  });
}

export function registerAdminHandlers(bot) {
  // /admin – вход в админку по паролю
  bot.command('admin', async (ctx) => {
    const lang = 'ru';
    const m = getMessages(lang);

    if (isAdmin(ctx)) {
      await ctx.reply('🛠 Админ-панель', adminMenuKeyboard());
      return;
    }

    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      await ctx.reply(
        'Админ-пароль не задан. Установите переменную окружения ADMIN_PASSWORD.'
      );
      return;
    }

    ctx.session = ctx.session || {};
    ctx.session.awaitingAdminPassword = true;
    await ctx.reply('Введите админ-пароль:');
  });

  // Обработка ввода пароля
  bot.on('text', async (ctx, next) => {
    if (!ctx.session || !ctx.session.awaitingAdminPassword) {
      return next();
    }
    const password = process.env.ADMIN_PASSWORD;
    const entered = ctx.message.text.trim();

    const lang = 'ru';
    const m = getMessages(lang);

    if (entered === password) {
      ctx.session.awaitingAdminPassword = false;
      ctx.session.isAdmin = true;
      await ctx.reply('✅ Админ-режим включён', adminMenuKeyboard());
    } else {
      await ctx.reply('❌ Неверный пароль. Попробуйте ещё раз или введите /admin.');
    }
  });

  // Админ-меню через inline-кнопки
  bot.action('admin_menu_bookings', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('Нет доступа', { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    await sendLastBookings(ctx);
  });

  bot.action('admin_menu_today', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('Нет доступа', { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    await sendTodayBookings(ctx);
  });

  bot.action('admin_menu_search', async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('Нет доступа', { show_alert: true });
      return;
    }
    await ctx.answerCbQuery();
    const lang = 'ru';
    const m = getMessages(lang);
    await ctx.reply(m.admin.searchUsage);
  });

  // Старые текстовые команды оставляем как есть – ими тоже можно пользоваться
  bot.command('bookings', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await sendLastBookings(ctx);
  });

  bot.command('today', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await sendTodayBookings(ctx);
  });

  // Упрощаем админку: убираем поиск, setstatus и подтверждение заявок – остаются только заявки и действия по ним

  bot.action(/^admin_booking_reject:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const bookingId = Number(ctx.match[1]);
    const bookingRes = await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['canceled', bookingId]
    );
    if (!bookingRes.rows.length) return;
    const booking = bookingRes.rows[0];

    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [booking.user_id]
    );
    const user = userRes.rows[0];
    const lang = (user && user.language) || 'ru';
    const mUser = getMessages(lang);
    const mAdmin = getMessages('ru');

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply(
      mAdmin.booking.adminRejected.replace('{{id}}', booking.id.toString())
    );

    if (user && user.telegram_id) {
      await ctx.telegram.sendMessage(
        user.telegram_id,
        mUser.booking.userAdminRejected
      );
    }
  });

  bot.action(/^admin_booking_reschedule:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const bookingId = Number(ctx.match[1]);
    const bookingRes = await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['reschedule_requested', bookingId]
    );
    if (!bookingRes.rows.length) return;
    const booking = bookingRes.rows[0];
    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [booking.user_id]
    );
    const user = userRes.rows[0];
    const lang = (user && user.language) || 'ru';
    const mUser = getMessages(lang);
    const mAdmin = getMessages('ru');

    await ctx.reply(
      mAdmin.booking.adminRescheduleRequested.replace(
        '{{id}}',
        booking.id.toString()
      )
    );
    if (user && user.telegram_id) {
      await ctx.telegram.sendMessage(
        user.telegram_id,
        mUser.booking.userAdminRescheduleRequested
      );
    }
  });

  bot.action(/^reminder_confirm:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const reminderId = Number(ctx.match[1]);
    const bookingId = Number(ctx.match[2]);
    const bookingRes = await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['confirmed', bookingId]
    );
    if (!bookingRes.rows.length) return;
    const booking = bookingRes.rows[0];

    await query(
      'UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', reminderId]
    );

    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [booking.user_id]
    );
    const user = userRes.rows[0];
    const lang = (user && user.language) || 'ru';
    const mUser = getMessages(lang);
    const mAdmin = getMessages('ru');

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply(mUser.reminders.userConfirmed);

    const adminId = process.env.ADMIN_CHAT_ID;
    if (adminId) {
      await ctx.telegram.sendMessage(
        adminId,
        mAdmin.reminders.adminReminderActionInfo
          .replace('{{action}}', 'confirm')
          .replace('{{id}}', booking.id.toString())
      );
    }
  });

  bot.action(/^reminder_cancel:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const reminderId = Number(ctx.match[1]);
    const bookingId = Number(ctx.match[2]);
    const bookingRes = await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['canceled', bookingId]
    );
    if (!bookingRes.rows.length) return;
    const booking = bookingRes.rows[0];

    await query(
      'UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', reminderId]
    );

    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [booking.user_id]
    );
    const user = userRes.rows[0];
    const lang = (user && user.language) || 'ru';
    const mUser = getMessages(lang);
    const mAdmin = getMessages('ru');

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply(mUser.reminders.userCanceled);

    const adminId = process.env.ADMIN_CHAT_ID;
    if (adminId) {
      await ctx.telegram.sendMessage(
        adminId,
        mAdmin.reminders.adminReminderActionInfo
          .replace('{{action}}', 'cancel')
          .replace('{{id}}', booking.id.toString())
      );
    }
  });

  bot.action(/^reminder_reschedule:(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const reminderId = Number(ctx.match[1]);
    const bookingId = Number(ctx.match[2]);
    const bookingRes = await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['reschedule_requested', bookingId]
    );
    if (!bookingRes.rows.length) return;
    const booking = bookingRes.rows[0];

    await query(
      'UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2',
      ['sent', reminderId]
    );

    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [booking.user_id]
    );
    const user = userRes.rows[0];
    const lang = (user && user.language) || 'ru';
    const mUser = getMessages(lang);
    const mAdmin = getMessages('ru');

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await ctx.reply(mUser.reminders.userRescheduleRequested);

    const adminId = process.env.ADMIN_CHAT_ID;
    if (adminId) {
      await ctx.telegram.sendMessage(
        adminId,
        mAdmin.reminders.adminReminderActionInfo
          .replace('{{action}}', 'reschedule')
          .replace('{{id}}', booking.id.toString())
      );
    }
  });
}


