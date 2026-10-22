// Giriş ve kayıt sayfalarının iki sütunlu iskeleti: solda kara tahta, sağda form.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { LocalePicker } from '../i18n/LocalePicker';

export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="login-page">
      <aside className="login-aside">
        <Link className="brand-mark" to="/login">SafeCodeShare</Link>
        <div>
          <h2>{t('auth.asideTitle')}</h2>
          <p>{t('auth.asideBody')}</p>
        </div>
        {/* Kod her dilde aynı kalır (kod soldan sağa yazılır); yalnızca yorum satırı çevrilir. */}
        <div className="chalk-code" aria-hidden="true" dir="ltr">
          <span className="ck">def</span> learn(code):{'\n'}
          {'    '}<span className="cm">{t('auth.asideComment')}</span>{'\n'}
          {'    '}<span className="ck">return</span> type_it_yourself(code)
        </div>
      </aside>
      <main className="login-main">
        <div className="login-locale">
          <LocalePicker compact id="auth-locale" />
        </div>
        {children}
      </main>
    </div>
  );
}
