import { Markup } from 'telegraf';
import { getMessages } from './helpers/utils.js';

// Главное меню в виде inline-кнопок под сообщением
export function mainMenuKeyboard(lang) {
  const m = getMessages(lang);
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(m.menu.book, 'menu_book'),
      Markup.button.callback(m.menu.price, 'menu_price')
    ],
    [
      Markup.button.callback(m.menu.faq, 'menu_faq'),
      Markup.button.callback(m.menu.portfolio, 'menu_portfolio')
    ],
    [
      Markup.button.callback(m.menu.myBookings, 'menu_my'),
      Markup.button.callback(m.menu.settings, 'menu_settings')
    ]
  ]);
}

export function settingsInlineKeyboard(lang) {
  const m = getMessages(lang);
  return Markup.inlineKeyboard([
    [Markup.button.callback(m.settings.changeLanguage, 'settings_change_lang')],
    [Markup.button.callback(m.common.back, 'menu_main')]
  ]);
}

// Обработчики меню реализованы в других модулях, здесь только билдера клавиатур.


