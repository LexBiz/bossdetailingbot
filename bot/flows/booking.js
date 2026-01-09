import { Markup } from 'telegraf';
import {
  getMessages,
  getLangFromUser,
  formatDate,
  generateCalendarDays,
  defaultVisitDateFromDayString,
  buildVisitDateWithTime,
  createBookingWithReminders,
  ensureUser
} from '../helpers/utils.js';
import { query, updateUserContact } from '../helpers/db.js';
import { mainMenuKeyboard } from '../menu.js';

const SERVICE_CATEGORIES = [
  'Интерьер',
  'Экстерьер',
  'Комплект',
  'Комплект VIP',
  'Химчистка',
  'Одношаговая полировка',
  'Многостадийная полировка',
  'Глубокая очистка',
  'Воск премиум',
  'Керамика',
  'Тонировка',
  'Плёнки',
  'Отдельные услуги'
];

// Для простоты конкретная услуга = категория,
// но можно расширить до нескольких вариантов внутри категории.
const SERVICES_BY_CATEGORY = SERVICE_CATEGORIES.reduce((acc, c) => {
  acc[c] = [c];
  return acc;
}, {});

export function registerBookingFlow(bot) {
  // Записаться – из главного меню (inline) и при ручном вводе текста
  bot.hears([/^📅 Записаться$/, /^📅 Rezervace$/], async (ctx) => startBooking(ctx));
  bot.action('menu_book', async (ctx) => {
    await ctx.answerCbQuery();
    await startBooking(ctx);
  });

  bot.action(/^book_cat:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const category = ctx.match[1];
    if (!ctx.session.booking) ctx.session.booking = {};
    ctx.session.booking.serviceCategory = category;
    ctx.session.booking.step = 'service';
    await askService(ctx);
  });

  bot.action(/^book_service:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const service = ctx.match[1];
    if (!ctx.session.booking) ctx.session.booking = {};
    ctx.session.booking.serviceName = service;
    ctx.session.booking.step = 'carClass';
    await askCarClass(ctx);
  });

  bot.action(/^book_class:(A|B|C)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session.booking) ctx.session.booking = {};
    ctx.session.booking.carClass = ctx.match[1];
    ctx.session.booking.step = 'date';
    await askDate(ctx);
  });

  bot.action(/^book_date:(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session.booking) ctx.session.booking = {};
    const dayStr = ctx.match[1];
    ctx.session.booking.dayStr = dayStr;
    ctx.session.booking.visitDate = defaultVisitDateFromDayString(dayStr);
    ctx.session.booking.step = 'time';
    await askTime(ctx);
  });

  bot.on('contact', async (ctx, next) => {
    const contact = ctx.message.contact;
    const phone = contact.phone_number;
    const user = await ensureUser(ctx);
    if (!user) return;

    // Если мы в шаге ввода телефона в процессе записи – продолжаем флоу
    if (ctx.session && ctx.session.booking && ctx.session.booking.step === 'phone') {
      await updateUserContact(user.id, phone, true);
      ctx.session.booking.phone = phone;
      ctx.session.booking.phoneVerified = true;
      ctx.session.booking.step = 'comment';
      await askComment(ctx);
      return;
    }

    // Если контакт отправлен вне флоу записи – просто сохраним и поблагодарим
    await updateUserContact(user.id, phone, true);
    const lang = getLangFromUser(user);
    const m = getMessages(lang);
    await ctx.reply(m.common.contactSaved);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session || !ctx.session.booking) {
      return next();
    }
    const step = ctx.session.booking.step;
    if (!step) return next();

    switch (step) {
      case 'time':
        {
          const timeText = ctx.message.text.trim();
          const match = timeText.match(/^(\d{1,2})[.:](\d{2})$/);
          if (!match) {
            const lang = ctx.state.userLang || 'ru';
            const m = getMessages(lang);
            await ctx.reply(
              '⏰ Введите время в формате *10.00* или *11.30* (часы и минуты через точку).',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          const hh = Number(match[1]);
          const mm = Number(match[2]);
          // Проверяем общую валидность
          if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
            await ctx.reply('⏰ Неверное время. Попробуйте ещё раз, например 10.00 или 18.30.');
            return;
          }
          // Рабочий диапазон 09:00–19:00
          if (hh < 9 || (hh === 19 && mm > 0) || hh > 19) {
            await ctx.reply(
              '⏰ Студия работает с *09:00 до 19:00*. Выберите, пожалуйста, время в этом диапазоне.',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          const d = new Date(ctx.session.booking.visitDate);
          // Проверяем, что не воскресенье (0 – воскресенье)
          if (d.getDay() === 0) {
            await ctx.reply(
              '🚫 В воскресенье студия не работает. Пожалуйста, выберите другой день.',
              { parse_mode: 'Markdown' }
            );
            ctx.session.booking.step = 'date';
            await askDate(ctx);
            return;
          }
          const dayStr = ctx.session.booking.dayStr;
          const zonedDate = dayStr
            ? buildVisitDateWithTime(dayStr, hh, mm)
            : buildVisitDateWithTime(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                hh,
                mm
              );
          ctx.session.booking.visitDate = zonedDate;
          ctx.session.booking.step = 'name';
          await askName(ctx);
          return;
        }
      case 'name':
        ctx.session.booking.name = ctx.message.text.trim();
        ctx.session.booking.step = 'phone';
        await askPhone(ctx);
        return;
      case 'phone':
        // пользователь отправил телефон текстом
        {
          const phone = ctx.message.text.trim();
          const user = await ensureUser(ctx);
          if (user) {
            await updateUserContact(user.id, phone, false);
            ctx.session.booking.phone = phone;
            ctx.session.booking.phoneVerified = false;
          }
          ctx.session.booking.step = 'comment';
          await askComment(ctx);
          return;
        }
      case 'comment':
        ctx.session.booking.comment =
          ctx.message.text.trim() === '-'
            ? ''
            : ctx.message.text.trim();
        ctx.session.booking.step = 'confirm';
        await showConfirmation(ctx);
        return;
      default:
        return next();
    }
  });

  bot.action(/^book_confirm$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.session.booking) {
      await ctx.reply('Заявка не найдена, начните запись заново.');
      return;
    }
    await finalizeBooking(ctx);
  });

  bot.action(/^book_cancel$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || 'ru';
    const m = getMessages(lang);
    ctx.session.booking = null;
    await ctx.reply(m.booking.cancelledUser, mainMenuKeyboard(lang));
  });

  // Кнопка "Назад" на каждом шаге
  bot.action(/^book_back:(main|category|service|carClass|date|time|name|phone|comment)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const target = ctx.match[1];
    const user = await ensureUser(ctx);
    const lang = getLangFromUser(user);
    const m = getMessages(lang);

    if (!ctx.session) ctx.session = {};
    if (!ctx.session.booking) ctx.session.booking = {};

    switch (target) {
      case 'main':
        ctx.session.booking = null;
        await ctx.reply(m.menu.menuHint, mainMenuKeyboard(lang));
        return;
      case 'category':
        ctx.session.booking.step = 'category';
        await startBooking(ctx);
        return;
      case 'service':
        ctx.session.booking.step = 'service';
        await askService(ctx);
        return;
      case 'carClass':
        ctx.session.booking.step = 'carClass';
        await askCarClass(ctx);
        return;
      case 'date':
        ctx.session.booking.step = 'date';
        await askDate(ctx);
        return;
      case 'time':
        ctx.session.booking.step = 'time';
        await askTime(ctx);
        return;
      case 'name':
        ctx.session.booking.step = 'name';
        await askName(ctx);
        return;
      case 'phone':
        ctx.session.booking.step = 'phone';
        await askPhone(ctx);
        return;
      case 'comment':
        ctx.session.booking.step = 'comment';
        await askComment(ctx);
        return;
      default:
        return;
    }
  });
}

async function startBooking(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  if (!ctx.session) ctx.session = {};
  ctx.session.booking = { step: 'category' };
  const m = getMessages(lang);

  const rows = SERVICE_CATEGORIES.map((c) => [
    { text: c, callback_data: `book_cat:${c}` }
  ]);
  rows.push([
    { text: m.common.back, callback_data: 'book_back:main' }
  ]);
  const keyboard = {
    inline_keyboard: rows
  };

  await ctx.reply(m.booking.start, {
    reply_markup: keyboard
  });
}

async function askService(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);
  const category = ctx.session.booking.serviceCategory;
  const services = SERVICES_BY_CATEGORY[category] || [category];
  const rows = services.map((s) => [
    { text: s, callback_data: `book_service:${s}` }
  ]);
  rows.push([
    { text: m.common.back, callback_data: 'book_back:category' }
  ]);
  const keyboard = {
    inline_keyboard: rows
  };

  await ctx.editMessageText(m.booking.chooseService, {
    reply_markup: keyboard
  }).catch(async () => {
    await ctx.reply(m.booking.chooseService, { reply_markup: keyboard });
  });
}

async function askCarClass(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'A', callback_data: 'book_class:A' },
        { text: 'B', callback_data: 'book_class:B' },
        { text: 'C', callback_data: 'book_class:C' }
      ],
      [
        { text: m.common.back, callback_data: 'book_back:service' }
      ]
    ]
  };

  const text =
    `${m.booking.chooseCarClass}\n\n` +
    `A – ${m.booking.carClassA}\nB – ${m.booking.carClassB}\nC – ${m.booking.carClassC}`;

  await ctx.editMessageText(text, {
    reply_markup: keyboard
  }).catch(async () => {
    await ctx.reply(text, { reply_markup: keyboard });
  });
}

async function askDate(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);

  const days = generateCalendarDays(7);
  const rows = [];
  for (let i = 0; i < days.length; i += 2) {
    const row = [];
    const d1 = days[i];
    row.push({
      text: d1.label,
      callback_data: `book_date:${d1.value}`
    });
    if (days[i + 1]) {
      const d2 = days[i + 1];
      row.push({
        text: d2.label,
        callback_data: `book_date:${d2.value}`
      });
    }
    rows.push(row);
  }

  // Быстрые кнопки "сегодня/завтра" — но если это воскресенье, не показываем
  const quickRow = [];
  const realToday = new Date();
  realToday.setHours(0, 0, 0, 0);
  const realTomorrow = new Date(realToday);
  realTomorrow.setDate(realToday.getDate() + 1);

  if (realToday.getDay() !== 0) {
    const yyyy = realToday.getFullYear();
    const mm = String(realToday.getMonth() + 1).padStart(2, '0');
    const dd = String(realToday.getDate()).padStart(2, '0');
    quickRow.push({
      text: m.common.today,
      callback_data: `book_date:${yyyy}-${mm}-${dd}`
    });
  }
  if (realTomorrow.getDay() !== 0) {
    const yyyy = realTomorrow.getFullYear();
    const mm = String(realTomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(realTomorrow.getDate()).padStart(2, '0');
    quickRow.push({
      text: m.common.tomorrow,
      callback_data: `book_date:${yyyy}-${mm}-${dd}`
    });
  }
  if (quickRow.length) {
    rows.unshift(quickRow);
  }

  rows.push([
    { text: m.common.back, callback_data: 'book_back:carClass' }
  ]);

  const keyboard = { inline_keyboard: rows };

  await ctx.reply(m.booking.chooseDate, {
    reply_markup: keyboard
  });
}

async function askTime(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);
  const keyboard = {
    inline_keyboard: [
      [{ text: m.common.back, callback_data: 'book_back:date' }]
    ]
  };
  await ctx.reply(m.booking.askTime, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function askName(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);
  const keyboard = {
    inline_keyboard: [
      [{ text: m.common.back, callback_data: 'book_back:time' }]
    ]
  };
  await ctx.reply(m.booking.askName, { reply_markup: keyboard });
}

async function askPhone(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);

  // Сообщение с пояснением и inline-кнопкой "Назад"
  const backKeyboard = {
    inline_keyboard: [
      [{ text: m.common.back, callback_data: 'book_back:name' }]
    ]
  };
  await ctx.reply(m.booking.askPhone, {
    parse_mode: 'Markdown',
    reply_markup: backKeyboard
  });

  // Отдельно отправляем reply-клавиатуру для отправки контакта
  const contactKeyboard = Markup.keyboard([
    Markup.button.contactRequest(m.booking.sendPhoneButton)
  ])
    .resize()
    .oneTime(true);
  await ctx.reply(m.booking.sendPhoneButton, contactKeyboard);
}

async function askComment(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);
  const keyboard = {
    inline_keyboard: [
      [{ text: m.common.back, callback_data: 'book_back:phone' }]
    ]
  };
  await ctx.reply(m.booking.askComment, { reply_markup: keyboard });
}

async function showConfirmation(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);

  const b = ctx.session.booking;
  const phoneStatus = b.phoneVerified
    ? m.booking.phoneStatusVerified
    : m.booking.phoneStatusUnverified;

  const summary = m.booking.summaryTemplate
    .replace('{{service}}', b.serviceName)
    .replace('{{category}}', b.serviceCategory)
    .replace('{{carClass}}', b.carClass)
    .replace('{{date}}', formatDate(b.visitDate))
    .replace('{{name}}', b.name)
    .replace('{{phone}}', b.phone || '-')
    .replace('{{phoneStatus}}', phoneStatus)
    .replace('{{comment}}', b.comment || '-');

  const keyboard = {
    inline_keyboard: [
      [
        { text: m.booking.confirmButtons.confirm, callback_data: 'book_confirm' }
      ],
      [
        { text: m.booking.confirmButtons.cancel, callback_data: 'book_cancel' }
      ],
      [
        { text: m.common.back, callback_data: 'book_back:comment' }
      ]
    ]
  };

  await ctx.reply(`${m.booking.confirmTitle}\n\n${summary}`, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

async function finalizeBooking(ctx) {
  const user = await ensureUser(ctx);
  const lang = getLangFromUser(user);
  ctx.state.userLang = lang;
  const m = getMessages(lang);
  const b = ctx.session.booking;
  if (!b || !user) {
    await ctx.reply(m.booking.errorNoActiveBooking);
    return;
  }

  const booking = await createBookingWithReminders({
    userId: user.id,
    serviceCategory: b.serviceCategory,
    serviceName: b.serviceName,
    carClass: b.carClass,
    visitDate: b.visitDate,
    comment: b.comment || '',
    source: 'telegram'
  });

  ctx.session.booking = null;

  await ctx.reply(m.booking.confirmedUser, {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(lang)
  });

  // Отправка заявки в общий чат с заявками (группа/канал)
  // Важно: шлём ТОЛЬКО в BOOKINGS_CHAT_ID (чтобы не было неожиданных отправок в личку админа)
  const targetChatId = process.env.BOOKINGS_CHAT_ID;
  if (targetChatId) {
    try {
      // Ежедневная нумерация заявок (1..N) — считается по дню создания
      const dailyRes = await query(
        'SELECT COUNT(*)::int AS n FROM bookings WHERE created_at::date = $1::date AND created_at <= $2',
        [booking.created_at, booking.created_at]
      );
      const dailyNo = dailyRes.rows[0]?.n || 0;

      const adminLang = 'ru';
      const ma = getMessages(adminLang);
      const phoneStatus = b.phoneVerified
        ? ma.booking.phoneStatusVerified
        : ma.booking.phoneStatusUnverified;
      const statusText = ma.statuses[booking.status] || booking.status;
      const adminText = ma.booking.adminBookingTemplate
        // В группе показываем номер "за день", чтобы каждый день начиналось с 1
        .replace('{{id}}', String(dailyNo || booking.id))
        .replace('{{name}}', b.name || '—')
        .replace('{{phone}}', b.phone || user.phone || '-')
        .replace('{{phoneStatus}}', phoneStatus)
        .replace('{{carClass}}', booking.car_class)
        .replace('{{category}}', booking.service_category)
        .replace('{{service}}', booking.service_name)
        .replace('{{date}}', formatDate(booking.visit_date))
        .replace('{{created}}', formatDate(booking.created_at))
        .replace('{{comment}}', booking.comment || '-')
        .replace('{{status}}', statusText);

      await ctx.telegram.sendMessage(
        targetChatId,
        `*${ma.booking.adminNewBookingTitle}*\n\n${adminText}`,
        {
          parse_mode: 'Markdown'
        }
      );
    } catch (err) {
      console.error('[BOOKINGS_NOTIFY] Failed to send booking to group', err);
    }
  }
}


