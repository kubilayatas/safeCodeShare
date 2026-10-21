// Giriş ve kayıt sayfalarının iki sütunlu iskeleti: solda kara tahta, sağda form.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="login-page">
      <aside className="login-aside">
        <Link className="brand-mark" to="/login">SafeCodeShare</Link>
        <div>
          <h2>Kodu tahtaya yaz, öğrenci okusun, kopyalayamasın.</h2>
          <p>
            Ders sırasında yazdığın kod öğrencilerin ekranında canlı akar. Seçilemez, kopyalanamaz;
            ekran görüntüsünden okutulmaya çalışıldığında da bozuk çıkar.
          </p>
        </div>
        <div className="chalk-code" aria-hidden="true">
          <span className="ck">def</span> ogren(kod):{'\n'}
          {'    '}<span className="cm"># kopyala-yapıştır yok</span>{'\n'}
          {'    '}<span className="ck">return</span> elle_yaz(kod)
        </div>
      </aside>
      <main className="login-main">{children}</main>
    </div>
  );
}
