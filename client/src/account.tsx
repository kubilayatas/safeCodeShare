// Oturumdaki kullanıcı ve plan hakları — tüm sayfalar buradan okur.
// Not: Buradaki kilitler yalnızca kullanıcıya yol göstermek içindir; asıl kontrol sunucudadır.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Entitlements, FeatureKey, MeResponse, PublicUser } from '@safecodeshare/shared';
import { apiFetch } from './api';

type AccountState = {
  user: PublicUser | null;
  entitlements: Entitlements | null;
  setMe: (me: MeResponse | null) => void;
  refresh: () => Promise<void>;
};

const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({
  initial,
  children
}: {
  initial: MeResponse | null;
  children: ReactNode;
}): JSX.Element {
  const [me, setMeState] = useState<MeResponse | null>(initial);
  const refresh = useCallback(async () => {
    try {
      setMeState(await apiFetch<MeResponse>('/api/auth/me'));
    } catch {
      setMeState(null);
    }
  }, []);
  const value = useMemo<AccountState>(
    () => ({ user: me?.user ?? null, entitlements: me?.entitlements ?? null, setMe: setMeState, refresh }),
    [me, refresh]
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount, AccountProvider içinde kullanılmalı');
  return ctx;
}

// Özellik açık mı? Hesap bilgisi yoksa (ör. sayfa yükleniyor) kilitli saymayız; sunucu zaten karar verir.
export function can(ent: Entitlements | null, key: FeatureKey): boolean {
  if (!ent) return true;
  return ent.unlimited || ent.limits[key];
}
