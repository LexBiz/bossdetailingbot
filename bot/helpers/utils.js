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

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
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
  // dayStr: YYYY-MM-DD, set default time 10:00 local
  const [yyyy, mm, dd] = dayStr.split('-').map(Number);
  const date = new Date();
  date.setFullYear(yyyy);
  date.setMonth(mm - 1);
  date.setDate(dd);
  date.setHours(10, 0, 0, 0);
  return date;
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


