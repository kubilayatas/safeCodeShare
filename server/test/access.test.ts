// resolveAccess için tablo tabanlı en az 15 senaryo (spesifikasyon §16).
import { describe, expect, it } from 'vitest';
import { resolveAccess } from '../src/access/resolveAccess';
import type { PadAccessRow } from '../src/access/resolveAccess';

const NOW = 1_700_000_000_000; // sabit zaman

function pad(overrides: Partial<PadAccessRow> = {}): PadAccessRow {
  return {
    id: 'p1',
    owner_id: 'owner-1',
    edit_token: 'EDIT-AAA-BBB',
    view_token: 'VIEW-XXX-YYY',
    edit_enabled: 0,
    view_enabled: 1,
    visible_from: null,
    expires_at: null,
    password_hash: null,
    copy_protect: 0,
    ...overrides
  };
}

const emptySet = new Set<string>();

describe('resolveAccess', () => {
  it('1. pad null ise none döner', () => {
    const a = resolveAccess(null, { sessionUser: null, token: null, unlockedPadIds: emptySet, now: NOW });
    expect(a.level).toBe('none');
    expect(a.channel).toBeNull();
  });

  it('2. sahip her zaman owner', () => {
    const a = resolveAccess(pad(), {
      sessionUser: { id: 'owner-1', role: 'teacher' },
      token: null,
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('owner');
    expect(a.channel).toBe('yjs');
  });

  it('3. admin her zaman owner', () => {
    const a = resolveAccess(pad(), {
      sessionUser: { id: 'admin-x', role: 'admin' },
      token: null,
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('owner');
  });

  it('4. sahip için süre dolmuş olsa da erişim açık', () => {
    const a = resolveAccess(pad({ expires_at: NOW - 1000 }), {
      sessionUser: { id: 'owner-1', role: 'teacher' },
      token: null,
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('owner');
  });

  it('5. süre dolmuş + geçerli view token → none, sebep belirtilir', () => {
    const a = resolveAccess(pad({ expires_at: NOW - 1 }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
    expect(a.reason).toMatch(/süresi/i);
  });

  it('6. geçerli edit token + edit_enabled=1 → edit', () => {
    const a = resolveAccess(pad({ edit_enabled: 1 }), {
      sessionUser: null,
      token: 'EDIT-AAA-BBB',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('edit');
    expect(a.channel).toBe('yjs');
  });

  it('7. geçerli edit token + edit_enabled=0 → none', () => {
    const a = resolveAccess(pad({ edit_enabled: 0 }), {
      sessionUser: null,
      token: 'EDIT-AAA-BBB',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('8. geçerli view token + view_enabled=1 → view (yjs kanalı)', () => {
    const a = resolveAccess(pad(), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('view');
    expect(a.channel).toBe('yjs');
  });

  it('9. view token + copy_protect=1 → view (protected kanalı)', () => {
    const a = resolveAccess(pad({ copy_protect: 1 }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('view');
    expect(a.channel).toBe('protected');
  });

  it('10. view token + view_enabled=0 → none', () => {
    const a = resolveAccess(pad({ view_enabled: 0 }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('11. yanlış token → none', () => {
    const a = resolveAccess(pad(), {
      sessionUser: null,
      token: 'YANLIS-TOKEN',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('12. visible_from gelecekte → none + Türkçe saat mesajı', () => {
    const future = new Date(NOW + 60 * 60 * 1000);
    future.setHours(14, 30, 0, 0);
    const a = resolveAccess(pad({ visible_from: future.getTime() }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
    expect(a.reason).toMatch(/14:30/);
  });

  it('13. şifreli + kilit açılmamış → none + "Şifre gerekli"', () => {
    const a = resolveAccess(pad({ password_hash: 'x' }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
    expect(a.reason).toBe('Şifre gerekli');
  });

  it('14. şifreli + kilit açılmış (unlockedPadIds) → view', () => {
    const a = resolveAccess(pad({ password_hash: 'x' }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: new Set(['p1']),
      now: NOW
    });
    expect(a.level).toBe('view');
  });

  it('15. boş token string → none (edit/view token ile eşleşmez)', () => {
    const a = resolveAccess(pad(), {
      sessionUser: null,
      token: '',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('16. token yok + oturum yok → none', () => {
    const a = resolveAccess(pad(), {
      sessionUser: null,
      token: null,
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('17. başka öğretmenin oturumu → none', () => {
    const a = resolveAccess(pad(), {
      sessionUser: { id: 'teacher-baska', role: 'teacher' },
      token: null,
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('none');
  });

  it('18. expires_at tam şimdiye eşit → süre dolmamış sayılır', () => {
    const a = resolveAccess(pad({ expires_at: NOW }), {
      sessionUser: null,
      token: 'VIEW-XXX-YYY',
      unlockedPadIds: emptySet,
      now: NOW
    });
    expect(a.level).toBe('view');
  });
});