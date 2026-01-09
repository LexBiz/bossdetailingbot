import { Telegraf, session, Markup } from 'telegraf';
import fs from 'fs';
import { messages, LANG, languagesList } from './messages.js';
import { mainMenuKeyboard, settingsInlineKeyboard } from './menu.js';
import { registerBookingFlow } from './flows/booking.js';
import { registerAdminHandlers } from './admin/index.js';
import { initCron } from './helpers/cron.js';
import {
  ensureUser,
  getLangFromUser,
  getMessages,
  formatDate
} from './helpers/utils.js';
import { query } from './helpers/db.js';

// Таблица цен по категориям A/B/C для красивого вывода
const PRICE_ITEMS = [
  { key: 'interior', ru: '🧽 Интерьер', cz: '🧽 Interiér', A: 400, B: 500, C: 600 },
  { key: 'exterior', ru: '🚿 Экстерьер', cz: '🚿 Exteriér', A: 400, B: 500, C: 600 },
  { key: 'set', ru: '✨ Комплект', cz: '✨ Komplet', A: 800, B: 900, C: 1200 },
  { key: 'set_vip', ru: '👑 Комплект VIP', cz: '👑 Komplet VIP', A: 1800, B: 2000, C: 2300 },
  { key: 'chem', ru: '🧴 Химчистка', cz: '🧴 Chemické čištění', A: 2800, B: 3200, C: 4500 },
  {
    key: 'polish_one',
    ru: '💡 Одношаговая полировка',
    cz: '💡 Jednokrokové leštění',
    A: 4000,
    B: 5000,
    C: 6500
  },
  {
    key: 'polish_multi',
    ru: '🌟 Многостадийная полировка',
    cz: '🌟 Vícekrokové leštění',
    A: 8000,
    B: 10000,
    C: 13000
  },
  {
    key: 'deep_clean',
    ru: '🧼 Глубокая очистка',
    cz: '🧼 Hloubkové čištění',
    A: 2600,
    B: 3100,
    C: 3600
  },
  {
    key: 'wax',
    ru: '🛡 Воск премиум',
    cz: '🛡 Prémiový vosk',
    A: 1500,
    B: 2000,
    C: 2500
  },
  { key: 'ceramic', ru: '🧪 Керамика', cz: '🧪 Keramika', A: 6700, B: 7700, C: 8700 },
  {
    key: 'tint',
    ru: '🌚 Тонировка',
    cz: '🌚 Tónování',
    A: 'от 3000',
    B: 'от 3000',
    C: 'от 3000'
  },
  {
    key: 'film',
    ru: '📦 Плёнки',
    cz: '📦 Fólie',
    A: 'индивидуально',
    B: 'индивидуálně',
    C: 'индивидуálně'
  },
  {
    key: 'single',
    ru: '🧰 Отдельные услуги',
    cz: '🧰 Samostatné služby',
    A: 'от 350',
    B: 'от 350',
    C: 'от 350'
  }
];

export function createBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('BOT_TOKEN is not set');
  }

  const bot = new Telegraf(token);
  bot.use(session());

  // middleware: загрузка пользователя и языка
  bot.use(async (ctx, next) => {
    try {
      if (ctx.from) {
        const user = await ensureUser(ctx);
        ctx.state.user = user;
        ctx.state.userLang = getLangFromUser(user);
      } else {
        ctx.state.userLang = LANG.RU;
      }
    } catch (e) {
      console.error('User middleware error', e);
      ctx.state.userLang = LANG.RU;
    }
    return next();
  });

  bot.start(async (ctx) => {
    const lang = ctx.state.userLang || LANG.RU;
    const m = messages[lang];
    const logoPath = process.env.LOGO_PATH;
    const photoUrl =
      process.env.LOGO_URL ||
      'https://dummyimage.com/800x400/000000/ffffff&text=BOSS+DETALING';

  const caption = `*${m.common.appName}*\n\n${m.start.welcome}`;

    const langButtons = languagesList.map((l) =>
      Markup.button.callback(l.label, `set_lang:${l.code}`)
    );
    const langKeyboard = Markup.inlineKeyboard([langButtons]);

    if (logoPath && fs.existsSync(logoPath)) {
      await ctx.replyWithPhoto(
        { source: logoPath },
        {
          caption,
          parse_mode: 'Markdown',
          ...langKeyboard
        }
      );
    } else {
      await ctx.replyWithPhoto(
        { url: photoUrl },
        {
          caption,
          parse_mode: 'Markdown',
          ...langKeyboard
        }
      );
    }
  });

  // Команда для получения ID текущего чата (для настройки группы заявок)
  bot.command('chatid', async (ctx) => {
    const chat = ctx.chat;
    const id = chat.id;
    const type = chat.type;
    await ctx.reply(
      `🆔 ID этого чата: \`${id}\`\nТип: *${type}*`,
      { parse_mode: 'Markdown' }
    );
    console.log('[CHAT INFO]', chat);
  });

  // Выбор языка (inline)
  bot.action(/^set_lang:(ru|cz)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.match[1] === 'cz' ? LANG.CZ : LANG.RU;
    const user = await ensureUser(ctx, lang);
    ctx.state.user = user;
    ctx.state.userLang = lang;
    const m = getMessages(lang);
    const text = `${m.start.languageSaved}\n\n${m.menu.menuHint}`;

    await ctx.reply(text, mainMenuKeyboard(lang));
  });

  // Главное меню (inline действия)
  bot.action('menu_main', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    const m = getMessages(lang);
    await ctx.reply(m.menu.menuHint, mainMenuKeyboard(lang));
  });

  bot.action('menu_price', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    await sendPriceCategoryQuestion(ctx, lang);
  });

  bot.action('menu_faq', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    const m = getMessages(lang);
    const faqText = `*${m.faq.title}*\n\n${m.faq.items.join('\n\n')}`;
    await ctx.reply(faqText, {
      parse_mode: 'Markdown',
      ...mainMenuKeyboard(lang)
    });
  });

  bot.action('menu_portfolio', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    const m = getMessages(lang);
    await ctx.reply(m.portfolio.text, {
      disable_web_page_preview: false,
      ...mainMenuKeyboard(lang)
    });
  });

  bot.action('menu_my', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    await sendMyBookings(ctx, lang);
  });

  bot.action(/^my_cancel:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const bookingId = Number(ctx.match[1]);
    const lang = ctx.state.userLang || LANG.RU;
    const m = getMessages(lang);

    const res = await query(
      `SELECT b.*, u.telegram_id, u.name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.id = $1 AND u.telegram_id = $2
       LIMIT 1`,
      [bookingId, ctx.from.id]
    );

    if (!res.rows.length) {
      await ctx.reply(m.myBookings.notFound);
      return;
    }

    const b = res.rows[0];
    const now = new Date();
    const visit = new Date(b.visit_date);
    const diffMs = visit.getTime() - now.getTime();
    if (diffMs < 2 * 60 * 60 * 1000) {
      await ctx.reply(m.myBookings.cancelTooLate);
      return;
    }

    await query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
      ['canceled', bookingId]
    );
    await query(
      'UPDATE reminders SET status = $1 WHERE booking_id = $2 AND status = $3',
      ['canceled', bookingId, 'pending']
    );

    await ctx.reply(m.myBookings.canceled.replace('{{id}}', bookingId));

    const targetChatId = process.env.BOOKINGS_CHAT_ID;
    if (targetChatId) {
      try {
        const ma = getMessages(LANG.RU);
        const statusText = ma.statuses['canceled'] || 'canceled';
        const adminText = ma.booking.adminBookingTemplate
          .replace('{{id}}', String(bookingId))
          .replace('{{name}}', b.name || '—')
          .replace('{{phone}}', b.phone || '-')
          .replace(
            '{{phoneStatus}}',
            b.phone_verified ? ma.booking.phoneStatusVerified : ma.booking.phoneStatusUnverified
          )
          .replace('{{carClass}}', b.car_class)
          .replace('{{category}}', b.service_category)
          .replace('{{service}}', b.service_name)
          .replace('{{date}}', formatDate(b.visit_date))
          .replace('{{created}}', formatDate(b.created_at))
          .replace('{{comment}}', b.comment || '-')
          .replace('{{status}}', statusText);

        await ctx.telegram.sendMessage(
          targetChatId,
          `*${ma.booking.adminCanceledByUserTitle}*\n\n${adminText}`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        console.error('[BOOKINGS_NOTIFY_CANCEL] Failed to send cancel notification', err);
      }
    }
  });

  bot.action('menu_settings', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    await sendSettings(ctx, lang);
  });

  // В прайсе кнопку "оставить номер" убрали — номер запрашивается только в процессе записи.

  // Настройки: смена языка из настроек
  bot.action('settings_change_lang', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.userLang || LANG.RU;
    const m = getMessages(lang);
    const buttons = languagesList.map((l) =>
      Markup.button.callback(l.label, `set_lang:${l.code}`)
    );
    const keyboard = Markup.inlineKeyboard([buttons]);
    await ctx.reply(m.start.chooseLanguage, keyboard);
  });

  // Регистрация сценариев
  registerBookingFlow(bot);
  registerAdminHandlers(bot);
  handlePriceCategoryAction(bot);

  // Инициализация cron-напоминаний
  initCron(bot);

  return bot;
}

async function sendMyBookings(ctx, lang) {
  const m = getMessages(lang);
  const res = await query(
    `SELECT b.*
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE u.telegram_id = $1 AND b.visit_date >= NOW() AND b.status != 'canceled'
     ORDER BY b.visit_date ASC
     LIMIT 10`,
    [ctx.from.id]
  );
  if (!res.rows.length) {
    await ctx.reply(m.myBookings.empty);
    return;
  }
  await ctx.reply(m.myBookings.title);
  for (const b of res.rows) {
    const status = m.statuses[b.status] || b.status;
    const text = m.myBookings.itemTemplate
      .replace('{{id}}', b.id.toString())
      .replace('{{date}}', formatDate(b.visit_date))
      .replace(
        '{{service}}',
        `${b.service_category} / ${b.service_name}`
      )
      .replace('{{carClass}}', b.car_class)
      .replace('{{status}}', status);
    const keyboard = {
      inline_keyboard: [
        [
          { text: m.myBookings.btnCancel, callback_data: `my_cancel:${b.id}` }
        ]
      ]
    };
    await ctx.reply(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

async function sendSettings(ctx, lang) {
  const m = getMessages(lang);
  await ctx.reply(m.settings.title, settingsInlineKeyboard(lang));
}

function buildPriceTextForCategory(lang, category) {
  const isRu = lang === LANG.RU;
  const m = getMessages(lang);
  const catLabel =
    category === 'A'
      ? isRu
        ? '🚗 Категория A (компакт, седан, универсал)'
        : '🚗 Kategorie A (kompaktní, sedan, kombi)'
      : category === 'B'
      ? isRu
        ? '🚙 Категория B (кроссовер, SUV)'
        : '🚙 Kategorie B (crossover, SUV)'
      : isRu
      ? '🚐 Категория C (минивэн, фургон)'
      : '🚐 Kategorie C (minivan, dodávka)';

  const title = `*${m.price.title}*\n${catLabel}\n\n`;

  const lines = PRICE_ITEMS.map((item) => {
    const label = isRu ? item.ru : item.cz;
    const value =
      category === 'A'
        ? item.A
        : category === 'B'
        ? item.B
        : item.C;
    return typeof value === 'number'
      ? `${label} — *${value}*`
      : `${label} — *${value}*`;
  });

  return `${title}${lines.join('\n')}${m.price.footer}`;
}

export async function handlePriceCategoryAction(bot) {
  bot.action(/^price_cat:(A|B|C)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const category = ctx.match[1];
    const lang = ctx.state.userLang || LANG.RU;
    const text = buildPriceTextForCategory(lang, category);
    const m = getMessages(lang);

    const keyboard = {
      inline_keyboard: [[{ text: m.common.back, callback_data: 'menu_main' }]]
    };

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }).catch(async () => {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });
  });
}

async function sendPriceCategoryQuestion(ctx, lang) {
  const m = getMessages(lang);
  const isRu = lang === LANG.RU;

  const titleRu =
    '🚘 *Выберите категорию вашего авто*\n\n' +
    '• 🚗 *Категория A* — хэтчбек, седан, универсал, компакт\n' +
    '• 🚙 *Категория B* — кроссовер, SUV\n' +
    '• 🚐 *Категория C* — минивэн, фургон';

  const titleCz =
    '🚘 *Vyberte kategorii vašeho vozu*\n\n' +
    '• 🚗 *Kategorie A* — hatchback, sedan, kombi, kompaktní vůz\n' +
    '• 🚙 *Kategorie B* — crossover, SUV\n' +
    '• 🚐 *Kategorie C* — minivan, dodávka';

  const text = isRu ? titleRu : titleCz;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🚗 A',
          callback_data: 'price_cat:A'
        },
        {
          text: '🚙 B',
          callback_data: 'price_cat:B'
        },
        {
          text: '🚐 C',
          callback_data: 'price_cat:C'
        }
      ],
      [
        {
          text: m.common.back,
          callback_data: 'menu_main'
        }
      ]
    ]
  };

  await ctx.reply(text, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}


