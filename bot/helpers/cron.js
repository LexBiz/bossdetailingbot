import cron from 'node-cron';
import { query } from './db.js';
import { getMessages, formatDate } from './utils.js';

export function initCron(bot) {
  // every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const res = await query(
        `SELECT r.*, b.service_name, b.service_category, b.car_class, b.visit_date,
                u.telegram_id, u.language
         FROM reminders r
         JOIN bookings b ON b.id = r.booking_id
         JOIN users u ON u.id = b.user_id
         WHERE r.status = 'pending' AND r.scheduled_at <= NOW()`,
        []
      );

      for (const row of res.rows) {
        if (!row.telegram_id) {
          await query('UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2', [
            'canceled',
            row.id
          ]);
          continue;
        }

        const lang = row.language || 'ru';
        const m = getMessages(lang);

        const title =
          row.reminder_type === '24h'
            ? m.reminders.before24hTitle
            : row.reminder_type === '3h'
            ? m.reminders.before3hTitle
            : m.reminders.before1hTitle;

        const text =
          `*${title}*\n\n` +
          m.reminders.bodyTemplate
            .replace('{{date}}', formatDate(row.visit_date))
            .replace(
              '{{service}}',
              `${row.service_category} – ${row.service_name}`
            )
            .replace('{{carClass}}', row.car_class);

        // Отправляем напоминание как информативное сообщение, без кнопок действий
        await bot.telegram.sendMessage(row.telegram_id, text, {
          parse_mode: 'Markdown'
        });

        await query(
          'UPDATE reminders SET status = $1, sent_at = NOW() WHERE id = $2',
          ['sent', row.id]
        );
      }
    } catch (err) {
      console.error('[CRON] Error in reminder job', err);
    }
  });

  // Сводка дня после закрытия (19:05), понедельник–суббота (воскресенье выходной)
  // Отправляется в BOOKINGS_CHAT_ID, если он задан.
  cron.schedule(
    '5 19 * * 1-6',
    async () => {
      const targetChatId = process.env.BOOKINGS_CHAT_ID;
      if (!targetChatId) return;
      try {
        const lang = 'ru';
        const m = getMessages(lang);
        const countRes = await query(
          "SELECT COUNT(*)::int AS n FROM bookings WHERE created_at::date = CURRENT_DATE AND source = 'telegram'",
          []
        );
        const n = countRes.rows[0]?.n || 0;
        const text =
          `📊 *Сводка за день*\n\n` +
          `Сегодня через бот записалось: *${n}*`;
        await bot.telegram.sendMessage(targetChatId, text, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('[CRON] Error in daily summary job', err);
      }
    },
    { timezone: process.env.CRON_TZ || 'Europe/Prague' }
  );
}





