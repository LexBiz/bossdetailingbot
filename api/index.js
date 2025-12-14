import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { createBot } from '../bot/bot.js';
import { query } from '../bot/helpers/db.js';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const bot = createBot();

const PORT = process.env.PORT || 3000;
const USE_WEBHOOK = String(process.env.USE_WEBHOOK).toLowerCase() === 'true';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// HTTP API: create booking from website
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      name,
      phone,
      serviceCategory,
      serviceName,
      carClass,
      visitDate,
      comment,
      language
    } = req.body || {};

    if (!serviceCategory || !serviceName || !carClass || !visitDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let userId = null;
    if (phone) {
      const u = await query(
        'SELECT * FROM users WHERE phone = $1 LIMIT 1',
        [phone]
      );
      if (u.rows.length) {
        userId = u.rows[0].id;
      } else {
        const ins = await query(
          'INSERT INTO users (phone, phone_verified, name, language) VALUES ($1, $2, $3, $4) RETURNING *',
          [phone, false, name || null, language || 'ru']
        );
        userId = ins.rows[0].id;
      }
    } else {
      const ins = await query(
        'INSERT INTO users (name, language) VALUES ($1, $2) RETURNING *',
        [name || null, language || 'ru']
      );
      userId = ins.rows[0].id;
    }

    const visit = new Date(visitDate);

    const bookingRes = await query(
      `INSERT INTO bookings (user_id, service_category, service_name, car_class, visit_date, comment, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [userId, serviceCategory, serviceName, carClass, visit, comment || '', 'website']
    );
    const booking = bookingRes.rows[0];

    // simple reminders for website bookings as well
    const before24h = new Date(visit.getTime() - 24 * 60 * 60 * 1000);
    const before1h = new Date(visit.getTime() - 60 * 60 * 1000);
    if (before24h > new Date()) {
      await query(
        'INSERT INTO reminders (booking_id, reminder_type, scheduled_at) VALUES ($1, $2, $3)',
        [booking.id, '24h', before24h]
      );
    }
    if (before1h > new Date()) {
      await query(
        'INSERT INTO reminders (booking_id, reminder_type, scheduled_at) VALUES ($1, $2, $3)',
        [booking.id, '1h', before1h]
      );
    }

    res.json({ ok: true, booking });
  } catch (err) {
    console.error('Error in POST /api/bookings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// HTTP API: list bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const { date, from, to } = req.query;
    let rows;
    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const r = await query(
        'SELECT * FROM bookings WHERE visit_date BETWEEN $1 AND $2 ORDER BY visit_date ASC',
        [start, end]
      );
      rows = r.rows;
    } else if (from && to) {
      const r = await query(
        'SELECT * FROM bookings WHERE visit_date BETWEEN $1 AND $2 ORDER BY visit_date ASC',
        [new Date(from), new Date(to)]
      );
      rows = r.rows;
    } else {
      const r = await query(
        'SELECT * FROM bookings ORDER BY visit_date DESC LIMIT 50',
        []
      );
      rows = r.rows;
    }
    res.json(rows);
  } catch (err) {
    console.error('Error in GET /api/bookings', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Telegram webhook endpoint
app.post('/api/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

async function start() {
  // Важно: поднимаем HTTP-сервер независимо от запуска polling.
  // В некоторых окружениях await bot.launch() может не возвращать управление сразу.
  app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });

  if (USE_WEBHOOK) {
    if (!WEBHOOK_URL) {
      console.error(
        'USE_WEBHOOK=true, но WEBHOOK_URL не указан. Укажите его в .env.'
      );
    } else {
      await bot.telegram.setWebhook(WEBHOOK_URL);
      console.log('[BOT] Webhook set to', WEBHOOK_URL);
    }
  } else {
    await bot.telegram.deleteWebhook().catch(() => {});
    bot
      .launch()
      .then(() => console.log('[BOT] Started in polling mode'))
      .catch((err) => console.error('[BOT] Failed to launch polling', err));
  }

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start application', err);
  process.exit(1);
});


