// Все тексты RU/CZ вынесены сюда

export const LANG = {
  RU: 'ru',
  CZ: 'cz'
};

export const languagesList = [
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'cz', label: '🇨🇿 Česky' }
];

export const messages = {
  ru: {
    common: {
      appName: 'BOSS DETALING',
      back: '⬅️ Назад',
      cancel: '❌ Отмена',
      yes: '✅ Да',
      no: '❌ Нет',
      today: '📆 Сегодня',
      tomorrow: '📆 Завтра',
      contactSaved: '✅ Контакт сохранён! Мы свяжемся с вами при необходимости.'
    },
    start: {
      welcome:
        'Добро пожаловать в студию детейлинга *BOSS DETALING*.\n\nВыберите язык обслуживания:',
      chooseLanguage: 'Пожалуйста, выберите язык обслуживания:',
      languageSaved: '✅ Язык сохранён: Русский.'
    },
    menu: {
      mainTitle: 'Главное меню',
      book: '📅 Записаться (-5% 🎁)',
      price: '💵 Прайс',
      faq: '❓ FAQ',
      portfolio: '📞 Контакты',
      myBookings: '📲 Мой заказ',
      settings: '⚙️ Настройки',
      menuHint: 'Выберите действие из меню ниже.'
    },
    booking: {
      start:
        '🚗 *Запишем ваш автомобиль на детейлинг!*\n\nВыберите категорию услуги:',
      chooseServiceCategory: '✨ Выберите интересующий вас тип услуги:',
      chooseService: '🔧 Какую услугу хотите оформить?',
      chooseCarClass:
        '🚘 Выберите класс вашего автомобиля:\n\n' +
        '• *Класс A* – малые авто, хэтчбеки, компактные седаны (Polo, Fabia и т.п.)\n' +
        '• *Класс B* – средние авто, кроссоверы, паркетники (Octavia, Kodiaq и т.п.)\n' +
        '• *Класс C* – большие SUV, минивэны, микроавтобусы',
      carClassA: '🚗 Класс A (малый / хэтчбек / компакт)',
      carClassB: '🚙 Класс B (седан / кроссовер)',
      carClassC: '🚐 Класс C (крупный / SUV / минивэн)',
      chooseDate:
        '📅 Выберите удобную дату визита (календарь ниже). Можно быстро выбрать *сегодня* или *завтра*.\n\n⏰ *График работы*: ежедневно с 09:00 до 19:00, ВОСКРЕСЕНЬЕ – выходной.',
      askTime:
        '⏰ Напишите удобное время визита *через точку*.\n\nПримеры: *10.00* или *11.30*\n\nРаботаем с *09:00 до 19:00*, воскресенье – выходной.',
      askName:
        '✏️ Напишите, пожалуйста, как к вам обращаться (имя или прозвище):',
      askPhone:
        '📞 Для связи нажмите кнопку *«Отправить номер»* ниже или напишите номер вручную.\nЕсли отправите номер текстом, он будет отмечен как *неподтверждённый*.',
      sendPhoneButton: '📞 Отправить номер',
      askComment:
        '💬 Напишите, пожалуйста, комментарий к заявке (марка/модель, цвет, особенности, пожелания) или отправьте "-" если без комментария.',
      confirmTitle: '✅ Проверьте данные вашей записи:',
      confirmButtons: {
        confirm: '🚗 Подтвердить запись',
        cancel: '❌ Отменить'
      },
      confirmedUser:
        '✨ Ваша запись успешно создана!\nМы свяжемся с вами для подтверждения деталей. Спасибо, что выбираете *BOSS DETALING*!',
      cancelledUser: '❌ Заявка отменена. Если передумаете — всегда ждём вас снова!',
      summaryTemplate:
        '📌 *Услуга*: {{service}}\n📂 *Категория*: {{category}}\n🚘 *Класс авто*: {{carClass}}\n📅 *Дата визита*: {{date}}\n👤 *Имя*: {{name}}\n📞 *Телефон*: {{phone}} ({{phoneStatus}})\n📝 *Комментарий*: {{comment}}',
      phoneStatusVerified: 'подтверждён',
      phoneStatusUnverified: 'неподтверждён',
      adminNewBookingTitle: '🆕 Новая заявка на детейлинг',
      adminButtons: {
        cancel: '❌ Отменить',
        reschedule: '🔁 Перенести'
      },
      errorNoActiveBooking:
        'Не удалось найти активную заявку. Попробуйте начать запись заново.',
      adminBookingTemplate:
        '📌 *Заявка #{{id}}*\n\n' +
        '👤 Клиент: {{name}} ({{phone}} / {{phoneStatus}})\n' +
        '🕒 Создано: {{created}}\n' +
        '🚘 Класс авто: {{carClass}}\n' +
        '🧼 Услуга: {{category}} – {{service}}\n' +
        '📅 Визит: {{date}}\n' +
        '📝 Комментарий: {{comment}}\n' +
        '📍 Статус: *{{status}}*'
    },
    myBookings: {
      empty: 'У вас пока нет активных записей.',
      title: 'Ваши ближайшие записи:',
      itemTemplate:
        '#{{id}} – {{date}} – {{service}} ({{carClass}}) – *{{status}}*',
      btnCancel: '❌ Отменить',
      btnReschedule: '🔁 Перенести',
      cancelConfirm: 'Вы уверены, что хотите отменить запись #{{id}}?',
      canceled: '✅ Запись #{{id}} отменена.',
      rescheduleStart:
        'Выберите новую дату для записи #{{id}} (календарь ниже):'
    },
    reminders: {
      before24hTitle: 'Напоминание о записи (за 24 часа)',
      before3hTitle: 'Напоминание о записи (за 3 часа)',
      before1hTitle: 'Напоминание о записи (за 1 час)',
      bodyTemplate:
        'Напоминаем о вашей записи в *BOSS DETALING*:\n\n*Дата визита*: {{date}}\n*Услуга*: {{service}} ({{carClass}})\n\nЕсли нужно изменить время — напишите нам в этот чат.',
      buttons: {
        confirm: '✅ Подтвердить',
        reschedule: '🔁 Перенести',
        cancel: '❌ Отменить'
      },
      userConfirmed: 'Спасибо, что подтвердили запись! Ждём вас в студии.',
      userCanceled:
        'Ваша запись отменена. Если захотите, вы всегда можете создать новую заявку.',
      userRescheduleRequested:
        'Запрос на перенос принят. Мы свяжемся с вами для выбора новой даты.',
      adminReminderActionInfo:
        'Клиент по напоминанию выбрал действие "{{action}}" по заявке #{{id}}.'
    },
    price: {
      title: '💵 Акционный прайс BOSS DETALING (категории A/B/C)\n\n🔥 ДЕЙСТВУЕТ ТОЛЬКО ДО КОНЦА ФЕВРАЛЯ!',
      footer:
        '\n\n⏰ Время одной услуги — примерно от 1 часа. Точная стоимость и длительность уточняются у администратора.',
      items: [
        '🧽 Интерьер: A400 / B500 / C600',
        '🚿 Экстерьер: A400 / B500 / C600',
        '✨ Комплект: A800 / B900 / C1200',
        '👑 Комплект VIP: A1800 / B2000 / C2300',
        '🧴 Химчистка: A2800 / B3200 / C4500',
        '💡 Одношаговая полировка: A4000 / B5000 / C6500',
        '🌟 Многостадийная полировка: A8000 / B10000 / C13000',
        '🧼 Глубокая очистка: A2600 / B3100 / C3600',
        '🛡 Воск премиум: A1500 / B2000 / C2500',
        '🧪 Керамика: A4000 / B5000 / C6500',
        '🌚 Тонировка: от 3000',
        '📦 Плёнки: индивидуально',
        '🧰 Отдельные услуги: от 350'
      ]
    },
    faq: {
      title: '❓ Частые вопросы',
      items: [
        '1️⃣ *Сколько времени занимает детейлинг?*\nОбычно от 3 до 8 часов – зависит от выбранного пакета, размера и состояния автомобиля.',
        '2️⃣ *Нужно ли заранее мыть автомобиль?*\nНет, полную мойку и предварительную очистку кузова и салона мы берём на себя.',
        '3️⃣ *Делаете ли вы керамику и защитные покрытия?*\nДа, работаем с профессиональными сертифицированными составами премиум-класса.',
        '4️⃣ *Когда лучше делать керамику?*\nИдеально – на новом или свежепокрашенном автомобиле, но мы можем восстановить и улучшить вид даже подержанного авто.',
        '5️⃣ *Какие есть классы автомобилей A / B / C?*\nA – малые авто и хэтчбеки, B – седаны и кроссоверы среднего класса, C – большие внедорожники и минивэны.',
        '6️⃣ *Можно ли подождать автомобиль у вас?*\nДа, у нас есть удобная зона ожидания с кофе и Wi‑Fi (уточняйте время записи).',
        '7️⃣ *Делаете ли вы выездной детейлинг?*\nВозможен выезд при наличии условий: доступ к электричеству и воде. Обсуждается индивидуально.',
        '8️⃣ *Как долго сохраняется результат?*\nПри правильном уходе эффект от керамики держится до 2–3 лет, от полировки и защитных покрытий – от 3 до 12 месяцев.',
        '9️⃣ *Какие способы оплаты вы принимаете?*\nНаличные, банковские карты и безналичный расчёт – уточняйте удобный вариант заранее.',
        '🔟 *Есть ли подарочные сертификаты?*\nДа, мы предлагаем подарочные сертификаты на услуги и готовые пакеты – отличный подарок для близких.'
      ]
    },
    portfolio: {
      text:
        '📍 *Студия BOSS DETALING*\n\n' +
        '📞 Телефон: +420 725 582 709\n' +
        '📌 Адрес: Wolkerova 2766, Kročehlavy 272 01, Kladno 1\n' +
        '⏰ График работы: каждый день с 09:00 до 19:00, *воскресенье – выходной*.\n\n' +
        'После оформления заявки администратор свяжется с вами и подтвердит точное время визита.',
    },
    settings: {
      title: '⚙️ Настройки',
      changeLanguage: '🌐 Сменить язык',
      languageChanged: '✅ Язык успешно изменён.'
    },
    admin: {
      notAdmin: 'У вас нет доступа к этой команде.',
      bookingsTitle: 'Последние 20 заявок:',
      todayTitle: 'Заявки на сегодня:',
      noBookings: 'Заявок не найдено.',
      searchUsage: 'Использование: /search <имя|телефон|ID>',
      setstatusUsage: 'Использование: /setstatus <id> <status>',
      statusUpdated: 'Статус заявки #{{id}} обновлён на "{{status}}".'
    },
    statuses: {
      pending: 'в ожидании',
      confirmed: 'подтверждена',
      canceled: 'отменена',
      rescheduled: 'перенесена',
      reschedule_requested: 'запрошен перенос',
      completed: 'завершена'
    }
  },
  cz: {
    common: {
      appName: 'BOSS DETALING',
      back: '⬅️ Zpět',
      cancel: '❌ Zrušit',
      yes: '✅ Ano',
      no: '❌ Ne',
      today: '📆 Dnes',
      tomorrow: '📆 Zítra',
      contactSaved: '✅ Kontakt byl uložen. V případě potřeby se vám ozveme.'
    },
    start: {
      welcome:
        'Vítejte v detailingovém studiu *BOSS DETALING*.\n\nVyberte prosím jazyk obsluhy:',
      chooseLanguage: 'Vyberte prosím jazyk obsluhy:',
      languageSaved: '✅ Jazyk uložen: Čeština.'
    },
    menu: {
      mainTitle: 'Hlavní menu',
      book: '📅 Rezervace (-5% 🎁)',
      price: '💵 Ceník',
      faq: '❓ FAQ',
      portfolio: '📞 Kontakt',
      myBookings: '📲 Moje rezervace',
      settings: '⚙️ Nastavení',
      menuHint: 'Vyberte akci z menu níže.'
    },
    booking: {
      start: 'Zarezervujeme váš vůz na detailing. Vyberte kategorii služby:',
      chooseServiceCategory: 'Vyberte kategorii služby:',
      chooseService: 'Vyberte konkrétní službu:',
      chooseCarClass: 'Vyberte třídu vozu:',
      carClassA: 'Třída A (malý)',
      carClassB: 'Třída B (střední)',
      carClassC: 'Třída C (velký/SUV)',
      chooseDate:
        'Vyberte datum návštěvy (kalendář níže) nebo použijte rychlé volby:',
      askName: 'Napište prosím, jak vám máme říkat:',
      askPhone:
        'Stiskněte tlačítko *„📞 Odeslat číslo“* níže nebo pošlete číslo ručně.\nPokud pošlete číslo textem, bude označeno jako *neověřené*.',
      sendPhoneButton: '📞 Odeslat číslo',
      askComment:
        'Přidejte komentář k rezervaci (značka/barva vozu, specifika apod.) nebo pošlete "-" pokud bez komentáře.',
      confirmTitle: 'Zkontrolujte prosím údaje rezervace:',
      confirmButtons: {
        confirm: '✅ Potvrdit rezervaci',
        cancel: '❌ Zrušit'
      },
      confirmedUser:
        '✅ Rezervace přijata! Ozveme se vám pro upřesnění detailů.\nDěkujeme, že jste si vybrali *BOSS DETALING*.',
      cancelledUser: 'Rezervace byla zrušena.',
      summaryTemplate:
        '*Služba*: {{service}}\n*Kategorie*: {{category}}\n*Třída vozu*: {{carClass}}\n*Datum návštěvy*: {{date}}\n*Jméno*: {{name}}\n*Telefon*: {{phone}} ({{phoneStatus}})\n*Komentář*: {{comment}}',
      phoneStatusVerified: 'ověřené',
      phoneStatusUnverified: 'neověřené',
      adminNewBookingTitle: '🆕 Nová rezervace na detailing',
      adminButtons: {
        accept: '✅ Přijmout',
        reject: '❌ Zrušit',
        reschedule: '🔁 Přesunout'
      },
      adminAccepted: '✅ Rezervace #{{id}} byla potvrzena administrátorem.',
      adminRejected: '❌ Rezervace #{{id}} byla zrušena administrátorem.',
      adminRescheduleRequested:
        '🔁 U rezervace #{{id}} byl požadován přesun. Kontaktujte prosím klienta.',
      userAdminAccepted: '✅ Vaše rezervace byla potvrzena!',
      userAdminRejected:
        '❌ Bohužel vaše rezervace byla zrušena. V případě potřeby vytvořte novou.',
      userAdminRescheduleRequested:
        '🔁 Administrátor požádal o přesun vaší rezervace. Ozveme se vám s novým termínem.',
      errorNoActiveBooking:
        'Aktivní rezervace nebyla nalezena. Zkuste prosím začít novou rezervaci.'
    },
    myBookings: {
      empty: 'Nemáte žádné aktivní rezervace.',
      title: 'Vaše nejbližší rezervace:',
      itemTemplate:
        '#{{id}} – {{date}} – {{service}} ({{carClass}}) – *{{status}}*',
      btnCancel: '❌ Zrušit',
      btnReschedule: '🔁 Přesunout',
      cancelConfirm: 'Opravdu chcete zrušit rezervaci #{{id}}?',
      canceled: '✅ Rezervace #{{id}} byla zrušena.',
      rescheduleStart:
        'Vyberte nové datum pro rezervaci #{{id}} (kalendář níže):'
    },
    reminders: {
      before24hTitle: 'Připomenutí rezervace (24 hodin předem)',
      before3hTitle: 'Připomenutí rezervace (3 hodiny předem)',
      before1hTitle: 'Připomenutí rezervace (1 hodinu předem)',
      bodyTemplate:
        'Připomínáme vaši rezervaci v *BOSS DETALING*:\n\n*Datum návštěvy*: {{date}}\n*Služba*: {{service}} ({{carClass}})\n\nPokud potřebujete změnit čas, napište nám do tohoto chatu.',
      buttons: {
        confirm: '✅ Potvrdit',
        reschedule: '🔁 Přesunout',
        cancel: '❌ Zrušit'
      },
      userConfirmed: 'Děkujeme za potvrzení rezervace! Těšíme se na vás.',
      userCanceled:
        'Vaše rezervace byla zrušena. Pokud budete chtít, můžete kdykoli vytvořit novou.',
      userRescheduleRequested:
        'Požadavek na přesun byl přijat. Ozveme se vám s novým termínem.',
      adminReminderActionInfo:
        'Klient v rámci připomenutí zvolil akci "{{action}}" u rezervace #{{id}}.'
    },
    price: {
      title: '💵 Akční ceník BOSS DETALING (kategorie A/B/C)\n\n🔥 PLATÍ POUZE DO KONCE ÚNORA!',
      footer:
        '\n\n⏰ Doba jedné služby je přibližně od 1 hodiny. Přesnou cenu a délku vám sdělí administrátor.',
      items: [
        '🧽 Interiér: A400 / B500 / C600',
        '🚿 Exteriér: A400 / B500 / C600',
        '✨ Komplet: A800 / B900 / C1200',
        '👑 Komplet VIP: A1800 / B2000 / C2300',
        '🧴 Chemické čištění: A2800 / B3200 / C4500',
        '💡 Jednokrokové leštění: A4000 / B5000 / C6500',
        '🌟 Vícekrokové leštění: A8000 / B10000 / C13000',
        '🧼 Hloubkové čištění: A2600 / B3100 / C3600',
        '🛡 Prémiový vosk: A1500 / B2000 / C2500',
        '🧪 Keramika: A4000 / B5000 / C6500',
        '🌚 Tónování: od 3000',
        '📦 Fólie: individuálně',
        '🧰 Samostatné služby: od 350'
      ]
    },
    faq: {
      title: '❓ Často kladené otázky',
      items: [
        '*1. Jak dlouho trvá detailing?*\nObvykle od 2 do 8 hodin podle balíčku a stavu vozu.',
        '*2. Musím auto předem umýt?*\nNe, kompletní mytí a přípravu zajistíme my.',
        '*3. Pracujete i s novými vozy?*\nAno, často aplikujeme ochranné povlaky a konzervaci pro nové vozy.',
        '*4. Jaké povlaky používáte?*\nPoužíváme pouze profesionální certifikované produkty prémiové třídy.',
        '*5. Dáváte záruku na keramiku?*\nAno, délka záruční doby závisí na zvoleném programu a podmínkách provozu.',
        '*6. Mohu počkat na dokončení prací na místě?*\nAno, máme pohodlnou čekací zónu (dostupnost míst si ověřte předem).',
        '*7. Nabízíte mobilní detailing?*\nPo předchozí domluvě a při splnění podmínek (elektřina, voda).',
        '*8. Fungujete pouze na objednání nebo mohu přijet bez rezervace?*\nDoporučujeme rezervaci, abychom vám mohli vyhradit konkrétní čas.',
        '*9. Jaké způsoby platby přijímáte?*\nHotovost i bezhotovost, detaily vám sdělí administrátor.',
        '*10. Mohu detailing darovat jako poukaz?*\nAno, nabízíme dárkové poukazy na služby i balíčky.'
      ]
    },
    portfolio: {
      text:
        '📍 *Studio BOSS DETALING*\n\n' +
        '📞 Telefon: +420 725 582 709\n' +
        '📌 Adresa: Wolkerova 2766, Kročehlavy 272 01, Kladno 1\n' +
        '⏰ Otevírací doba: každý den 09:00–19:00, *neděle – zavřeno*.\n\n' +
        'Po vytvoření rezervace vás bude kontaktovat administrátor pro potvrzení přesného času.'
    },
    settings: {
      title: '⚙️ Nastavení',
      changeLanguage: '🌐 Změnit jazyk',
      languageChanged: '✅ Jazyk byl úspěšně změněn.'
    },
    admin: {
      notAdmin: 'K této příkazu nemáte přístup.',
      bookingsTitle: 'Posledních 20 rezervací:',
      todayTitle: 'Dnešní rezervace:',
      noBookings: 'Nebyly nalezeny žádné rezervace.',
      searchUsage: 'Použití: /search <jméno|telefon|ID>',
      setstatusUsage: 'Použití: /setstatus <id> <status>',
      statusUpdated:
        'Stav rezervace #{{id}} byl aktualizován na "{{status}}".'
    },
    statuses: {
      pending: 'čeká na potvrzení',
      confirmed: 'potvrzena',
      canceled: 'zrušena',
      rescheduled: 'přesunuta',
      reschedule_requested: 'požadován přesun',
      completed: 'dokončena'
    }
  }
};


