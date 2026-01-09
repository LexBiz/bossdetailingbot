import { messages, LANG } from '../messages.js';
import { query } from './db.js';

export function getLangFromUser(user) {
  if (!user || !user.language) return LANG.RU;
  return user.language === LANG.CZ ? LANG.CZ : LANG.RU;
}

export function getMessages(lang) {
  return lang === LANG.CZ ? messages.cz : messages.ru;
}

export function t(lang, path, vars = {}) {
  const locale = getMessages(lang);
  const parts = path.split('.');
  let current = locale;
  for (const p of parts) {
    if (current && Object.prototype.hasOwnProperty.call(current, p)) {
      current = current[p];
    } else {
      current = null;
      break;
    }
  }
  if (typeof current === 'string') {
    return applyTemplate(current, vars);
  }
  return '';
}

export function applyTemplate(str, vars) {
  return str.replace(/{{(\w+)}}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : ''
  );
}

const DEFAULT_TZ = process.env.CRON_TZ || 'Europe/Prague';

function getTzOffset(date, timeZone = DEFAULT_TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

function makeDateInTz({ year, month, day, hour, minute }, timeZone = DEFAULT_TZ) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offset = getTzOffset(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function formatDate(date, timeZone = DEFAULT_TZ) {
  if (!date) return '';
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.format(d).replace(',', '');
}

export function generateCalendarDays(numDays = 7) {
  const days = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // Воскресенье (0) пропускаем — студия не работает
  let offset = 0;
  while (days.length < numDays) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    offset += 1;
    if (d.getDay() === 0) continue;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const label = `${dd}.${mm}`;
    const value = `${yyyy}-${mm}-${dd}`;
    days.push({ label, value });
  }
  return days;
}

export function defaultVisitDateFromDayString(dayStr) {
  // dayStr: YYYY-MM-DD, set default time 10:00 in Prague timezone
  const [yyyy, mm, dd] = dayStr.split('-').map(Number);
  return makeDateInTz({ year: yyyy, month: mm, day: dd, hour: 10, minute: 0 });
}

export function buildVisitDateWithTime(dayStr, hour, minute) {
  const [yyyy, mm, dd] = dayStr.split('-').map(Number);
  return makeDateInTz({ year: yyyy, month: mm, day: dd, hour, minute });
}

export async function createBookingWithReminders({
  userId,
  serviceCategory,
  serviceName,
  carClass,
  visitDate,
  comment,
  source = 'telegram'
}) {
  const bookingRes = await query(
    `INSERT INTO bookings (user_id, service_category, service_name, car_class, visit_date, comment, source, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
     RETURNING *`,
    [userId, serviceCategory, serviceName, carClass, visitDate, comment, source]
  );
  const booking = bookingRes.rows[0];

  const visit = new Date(booking.visit_date);
  const reminders = [];

  // Для записей из Telegram — напоминание за 3 часа.
  // Для записей с сайта (website) можно оставить 24h/1h (или отключить отдельно).
  if (source === 'telegram') {
    const before3h = new Date(visit.getTime() - 3 * 60 * 60 * 1000);
    if (before3h > new Date()) {
      reminders.push({ type: '3h', at: before3h });
    }
  } else {
    const before24h = new Date(visit.getTime() - 24 * 60 * 60 * 1000);
    if (before24h > new Date()) {
      reminders.push({ type: '24h', at: before24h });
    }
    const before1h = new Date(visit.getTime() - 60 * 60 * 1000);
    if (before1h > new Date()) {
      reminders.push({ type: '1h', at: before1h });
    }
  }

  for (const r of reminders) {
    await query(
      'INSERT INTO reminders (booking_id, reminder_type, scheduled_at) VALUES ($1, $2, $3)',
      [booking.id, r.type, r.at]
    );
  }

  return booking;
}

export async function getUserByTelegramId(telegramId) {
  const res = await query(
    'SELECT * FROM users WHERE telegram_id = $1 LIMIT 1',
    [telegramId]
  );
  return res.rows[0] || null;
}

export async function ensureUser(ctx, preferredLang) {
  if (!ctx.from) return null;
  let user = await getUserByTelegramId(ctx.from.id);
  if (!user) {
    const lang = preferredLang || LANG.RU;
    const name = [ctx.from.first_name, ctx.from.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const res = await query(
      'INSERT INTO users (telegram_id, name, language) VALUES ($1, $2, $3) RETURNING *',
      [ctx.from.id, name || null, lang]
    );
    user = res.rows[0];
  } else if (preferredLang && user.language !== preferredLang) {
    const res = await query(
      'UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [preferredLang, user.id]
    );
    user = res.rows[0];
  }
  return user;
}


