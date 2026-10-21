import { randomBytes, timingSafeEqual } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const idNano = customAlphabet(ALPHABET, 10);   // pad id
const editNano = customAlphabet(ALPHABET, 24); // edit token
const viewNano = customAlphabet(ALPHABET, 16); // view token (pad veya ders)
const shortNano = customAlphabet(ALPHABET, 16); // course view token

export function newPadId(): string {
  return idNano();
}

export function newEditToken(): string {
  return editNano();
}

export function newViewToken(): string {
  return viewNano();
}

export function newCourseViewToken(): string {
  return shortNano();
}

// 32 byte rastgele hex (64 karakter) — oturum kimliği
export function newSessionId(): string {
  return randomBytes(32).toString('hex');
}

// Sabit zamanlı string karşılaştırma
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Genel amaçlı id
export function randomId(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}