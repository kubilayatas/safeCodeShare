// Şifreli pad kilit çerezleri: pad'e ve o anki şifreye bağlı olmalı.
import { describe, expect, it } from 'vitest';
import { collectUnlockPadIds, signUnlockValue } from '../src/util/cookies';

const SECRET = 'x'.repeat(40);

describe('kilit çerezleri', () => {
  const padA = { id: 'padAAAAAAA', password_hash: '$2a$12$hashA' };
  const padB = { id: 'padBBBBBBB', password_hash: '$2a$12$hashB' };

  it('doğru pad ve şifre için kilidi açar', () => {
    const cookies = { [`unlock_${padA.id}`]: signUnlockValue(padA.id, padA.password_hash, SECRET) };
    expect(collectUnlockPadIds(cookies, SECRET, padA).has(padA.id)).toBe(true);
  });

  it('başka bir pad’in çerezi kopyalanarak kullanılamaz', () => {
    const valueFromA = signUnlockValue(padA.id, padA.password_hash, SECRET);
    const forged = { [`unlock_${padB.id}`]: valueFromA };
    expect(collectUnlockPadIds(forged, SECRET, padB).size).toBe(0);
  });

  it('şifre değişince eski çerez geçersiz olur', () => {
    const cookies = { [`unlock_${padA.id}`]: signUnlockValue(padA.id, padA.password_hash, SECRET) };
    const changed = { ...padA, password_hash: '$2a$12$yeniHash' };
    expect(collectUnlockPadIds(cookies, SECRET, changed).size).toBe(0);
  });

  it('farklı gizli anahtarla imzalanmış çerez reddedilir', () => {
    const cookies = { [`unlock_${padA.id}`]: signUnlockValue(padA.id, padA.password_hash, 'y'.repeat(40)) };
    expect(collectUnlockPadIds(cookies, SECRET, padA).size).toBe(0);
  });
});
