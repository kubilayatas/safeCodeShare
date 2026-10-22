-- Lemon Squeezy abonelikleri. Kullanıcının Pro hakkı access_until > şimdi olan bir
-- abonelikten gelir; yöneticinin elle verdiği Pro (users.plan) bundan bağımsızdır.
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                 -- Lemon Squeezy abonelik kimliği
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_id TEXT,
  variant_id TEXT,
  billing_interval TEXT,                -- month | year (hangi varyanttan alındığına göre)
  status TEXT NOT NULL,
  renews_at INTEGER,
  ends_at INTEGER,
  trial_ends_at INTEGER,
  access_until INTEGER NOT NULL DEFAULT 0,  -- Pro'nun geçerli olduğu son an (ms)
  card_brand TEXT,
  card_last4 TEXT,
  user_email TEXT,
  test_mode INTEGER NOT NULL DEFAULT 0,
  ls_updated_at INTEGER NOT NULL,      -- sıra dışı gelen webhook'ları ayıklamak için
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, access_until);

-- Gelen webhook'ların kaydı (sorun giderme için; 180 günden eskiler silinir)
CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  object_id TEXT,
  received_at INTEGER NOT NULL,
  result TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_events_time ON billing_events(received_at);
