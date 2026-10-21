// Yan etkisiz saf yetki fonksiyonu (spesifikasyon §5.1 + EK §E).

export type AccessLevel = 'owner' | 'edit' | 'view' | 'none';
export type AccessChannel = 'yjs' | 'protected';

export type Access = {
  level: AccessLevel;
  channel: AccessChannel | null;
  reason?: string;
};

export type ResolveAccessSessionUser = {
  id: string;
  role: 'admin' | 'teacher';
};

export type ResolveAccessInput = {
  sessionUser: ResolveAccessSessionUser | null;
  token: string | null;
  unlockedPadIds: ReadonlySet<string>;
  now: number;
};

// Yetki kararı için gereken pad alanları
export type PadAccessRow = {
  id: string;
  owner_id: string;
  edit_token: string;
  view_token: string;
  edit_enabled: number;
  view_enabled: number;
  visible_from: number | null;
  expires_at: number | null;
  password_hash: string | null;
  copy_protect: number;
  ocr_protect?: number;
  // Pad sahibinin hesap durumu (sorguda users tablosundan JOIN ile gelir).
  owner_status?: string;
};

// Sabit zamanlı string karşılaştırma — uzunluklar farklıysa false.
// (util/tokens.ts'teki safeEqual ile aynı mantık, ama bu dosya yan etkisiz kalmalı.)
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function formatHHMM(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function resolveAccess(pad: PadAccessRow | null | undefined, input: ResolveAccessInput): Access {
  // 1. Pad yoksa
  if (!pad) {
    return { level: 'none', channel: null, reason: 'Pad bulunamadı' };
  }

  // 2. Sahip veya admin her şeyi yapabilir; süre, şifre ve görünürlük etkilemez.
  if (input.sessionUser) {
    const u = input.sessionUser;
    if (u.role === 'admin' || u.id === pad.owner_id) {
      return { level: 'owner', channel: 'yjs' };
    }
  }

  // 2b. Sahibi askıya alınmış hesapların paylaşımları kapalıdır.
  if (pad.owner_status === 'suspended') {
    return { level: 'none', channel: null, reason: 'Bu paylaşım şu anda kullanılamıyor' };
  }

  // 3. Süre dolmuş mu?
  if (pad.expires_at != null && pad.expires_at < input.now) {
    return { level: 'none', channel: null, reason: 'Bu paylaşımın süresi doldu' };
  }

  const token = input.token;

  // 4. Edit token + açık
  if (token != null && token !== '' && pad.edit_enabled === 1 && constantTimeEqual(token, pad.edit_token)) {
    return { level: 'edit', channel: 'yjs' };
  }

  // 5. View token + açık
  if (token != null && token !== '' && pad.view_enabled === 1 && constantTimeEqual(token, pad.view_token)) {
    // 5a. visible_from gelecekte mi?
    if (pad.visible_from != null && pad.visible_from > input.now) {
      return {
        level: 'none',
        channel: null,
        reason: `Bu kod ${formatHHMM(pad.visible_from)}'de yayınlanacak`
      };
    }
    // 5b. Şifreli ve kilit açılmamış mı?
    if (pad.password_hash != null && !input.unlockedPadIds.has(pad.id)) {
      return { level: 'none', channel: null, reason: 'Şifre gerekli' };
    }
    // 5c. Kanal: kopyalama koruması açıksa protected, kapalıysa yjs
    const channel: AccessChannel = pad.copy_protect === 1 ? 'protected' : 'yjs';
    return { level: 'view', channel };
  }

  // 6. Aksi halde
  return { level: 'none', channel: null };
}