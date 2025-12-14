-- PostgreSQL schema for BOSS DETALING bot

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT,
  phone VARCHAR(32),
  phone_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  language VARCHAR(4) DEFAULT 'ru',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_uindex ON users(telegram_id) WHERE telegram_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  service_category TEXT NOT NULL,
  service_name TEXT NOT NULL,
  car_class CHAR(1) NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(32) DEFAULT 'pending',
  comment TEXT,
  source VARCHAR(16) DEFAULT 'telegram',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_visit_date_idx ON bookings(visit_date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type VARCHAR(16) NOT NULL, -- '24h' | '1h'
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(16) DEFAULT 'pending', -- 'pending' | 'sent' | 'canceled'
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS reminders_scheduled_idx ON reminders(scheduled_at, status);





