-- Herkese açık üyelik, planlar ve AI/OCR koruması

-- Kullanıcı planı ve durumu
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';          -- 'free' | 'pro'
ALTER TABLE users ADD COLUMN plan_expires_at INTEGER;                     -- NULL = süresiz
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';       -- 'active' | 'suspended'
ALTER TABLE users ADD COLUMN limits_override TEXT;                        -- JSON: plana göre özel limitler
ALTER TABLE users ADD COLUMN admin_note TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
ALTER TABLE users ADD COLUMN signup_source TEXT NOT NULL DEFAULT 'admin'; -- 'admin' | 'self'

-- Bu geçişten önce var olan hesapları yönetici elle eklemişti: tam özellikli kalsınlar.
UPDATE users SET plan = 'pro' WHERE role = 'teacher';

-- Site geneli ayarlar (plan limitleri, kayıt açık/kapalı, iletişim bilgisi...)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- AI/OCR koruması: 0 kapalı, 1 hafif, 2 güçlü (yalnızca kopyalama koruması açıkken etkili)
ALTER TABLE pads ADD COLUMN ocr_protect INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_courses_owner ON courses(owner_id);
