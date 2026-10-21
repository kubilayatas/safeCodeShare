import { z } from 'zod';

// Ortam değişkenleri şeması
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  // Render'da ayarlanmazsa Render'ın verdiği adres (https://xxx.onrender.com) kullanılır.
  PUBLIC_URL: z.string().url().default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'),
  APP_NAME: z.string().min(1).max(120).default('SafeCodeShare'),
  DATA_DIR: z.string().min(1).default('./data'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET en az 32 karakter olmalı'),
  SESSION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_NAME: z.string().min(1).max(120).optional(),
  DOMAIN: z.string().optional(),
  // Test kolaylığı için
  LOGIN_RATE_MAX: z.coerce.number().int().positive().default(10),
  UNLOCK_RATE_MAX: z.coerce.number().int().positive().default(20),
  FORMAT_RATE_MAX: z.coerce.number().int().positive().default(30),
  REGISTER_RATE_MAX: z.coerce.number().int().positive().default(5)
});

export type AppConfig = z.infer<typeof EnvSchema> & {
  isProd: boolean;
  isTest: boolean;
};

import fs from 'node:fs';
import path from 'node:path';

function tryLoadEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '.env.local')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(c);
          break;
        }
      } catch {
        /* yut */
      }
    }
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  tryLoadEnv();
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Ortam değişkenleri geçersiz:\n${msg}`);
  }
  const cfg = parsed.data;

  // Üretimde COOKIE_SECRET daha sıkı kontrol
  if (cfg.NODE_ENV === 'production' && cfg.COOKIE_SECRET.length < 32) {
    throw new Error('Üretim ortamında COOKIE_SECRET en az 32 karakter olmalı.');
  }

  return {
    ...cfg,
    isProd: cfg.NODE_ENV === 'production',
    isTest: cfg.NODE_ENV === 'test'
  };
}