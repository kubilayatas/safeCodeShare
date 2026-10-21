// WebSocket upgrade isteğinde Cookie header'ını parse etmek ve imzalı
// `unlock_<padId>` çerezlerini doğrulamak için yardımcılar.

import { createHash } from 'node:crypto';
import signature from 'cookie-signature';
import type { Response } from 'express';

export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const raw = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

const UNLOCK_PREFIX = 'unlock_';
const UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

// Kilit çerezi hem pad'e hem de o anki şifreye bağlıdır:
//  - Başka bir pad'in çerezi kopyalanıp kullanılamaz (payload'da padId var).
//  - Öğretmen şifreyi değiştirince eski çerezler geçersiz olur (payload'da şifre parmak izi var).
export function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('base64url').slice(0, 16);
}

function unlockPayload(padId: string, passwordHash: string): string {
  return `${padId}.${passwordFingerprint(passwordHash)}`;
}

export function signUnlockValue(padId: string, passwordHash: string, secret: string): string {
  return signature.sign(unlockPayload(padId, passwordHash), secret);
}

export function verifyUnlockValue(
  signed: string,
  padId: string,
  passwordHash: string,
  secret: string
): boolean {
  const unsig = signature.unsign(signed, secret);
  return unsig === unlockPayload(padId, passwordHash);
}

// Verilen pad için geçerli bir kilit çerezi varsa { pad.id } döner, yoksa boş küme.
export function collectUnlockPadIds(
  cookies: Record<string, string> | undefined,
  secret: string,
  pad: { id: string; password_hash: string | null } | null | undefined
): Set<string> {
  const out = new Set<string>();
  if (!cookies || !pad || pad.password_hash == null) return out;
  const raw = cookies[`${UNLOCK_PREFIX}${pad.id}`];
  if (typeof raw !== 'string' || raw.length === 0) return out;
  try {
    if (verifyUnlockValue(raw, pad.id, pad.password_hash, secret)) out.add(pad.id);
  } catch {
    // imza geçersiz, atla
  }
  return out;
}

export function setUnlockCookie(
  res: Response,
  padId: string,
  passwordHash: string,
  secret: string,
  secure: boolean
): void {
  res.cookie(`${UNLOCK_PREFIX}${padId}`, signUnlockValue(padId, passwordHash, secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: UNLOCK_TTL_MS,
    path: '/'
  });
}