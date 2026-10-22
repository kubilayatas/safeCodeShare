import Shell from '../components/Shell';
import { useI18n } from '../i18n';

// ÖNEMLİ (site sahibi için): Bu metin genel bir başlangıç taslağıdır, hukuki danışmanlık değildir.
// Siteyi herkese açmadan önce kendi bilgilerinizle (veri sorumlusu, iletişim adresi vb.)
// güncelleyin ve hizmet verdiğiniz ülkelerin kurallarına (KVKK, GDPR vb.) göre bir hukukçuya
// kontrol ettirin.
export default function Terms(): JSX.Element {
  const { t } = useI18n();
  return (
    <Shell narrow>
      <article className="prose">
        <h1>{t('terms.title')}</h1>
        <p className="muted">{t('terms.adminNote')}</p>

        <h2>{t('terms.serviceH')}</h2>
        <p>{t('terms.serviceP')}</p>

        <h2>{t('terms.dataH')}</h2>
        <ul>
          <li>{t('terms.data1')}</li>
          <li>{t('terms.data2')}</li>
          <li>{t('terms.data3')}</li>
          <li>{t('terms.data4')}</li>
        </ul>

        <h2>{t('terms.useH')}</h2>
        <p>{t('terms.useP')}</p>

        <h2>{t('terms.rulesH')}</h2>
        <ul>
          <li>{t('terms.rules1')}</li>
          <li>{t('terms.rules2')}</li>
        </ul>

        <h2 id="payments">{t('terms.payH')}</h2>
        <p>{t('terms.payP')}</p>
        <p>{t('terms.refundP')}</p>

        <h2>{t('terms.protH')}</h2>
        <p>{t('terms.protP')}</p>

        <h2>{t('terms.rightsH')}</h2>
        <p>{t('terms.rightsP')}</p>
      </article>
    </Shell>
  );
}
