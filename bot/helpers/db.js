import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let poolConfig;

if (process.env.DATABASE_URL) {
  // Если указан DATABASE_URL – используем его (например, на проде/Railway)
  poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
} else {
  // Для локальной разработки проще задать отдельные переменные
  poolConfig = {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password:
      typeof process.env.PGPASSWORD === 'string'
        ? process.env.PGPASSWORD
        : undefined,
    database: process.env.PGDATABASE || 'boss_detailing'
  };
}

export const pool = new Pool(poolConfig);

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}

export async function getOrCreateUserByTelegram(telegramUser, language) {
  if (!telegramUser) return null;
  const telegramId = telegramUser.id;
  const name = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  const existing = await query(
    'SELECT * FROM users WHERE telegram_id = $1 LIMIT 1',
    [telegramId]
  );
  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    if (language && user.language !== language) {
      const updated = await query(
        'UPDATE users SET language = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [language, user.id]
      );
      return updated.rows[0];
    }
    return user;
  }

  const inserted = await query(
    'INSERT INTO users (telegram_id, name, language) VALUES ($1, $2, $3) RETURNING *',
    [telegramId, name || null, language || 'ru']
  );
  return inserted.rows[0];
}

export async function updateUserContact(userId, phone, verified) {
  await query(
    'UPDATE users SET phone = $1, phone_verified = $2, updated_at = NOW() WHERE id = $3',
    [phone, verified, userId]
  );
}


