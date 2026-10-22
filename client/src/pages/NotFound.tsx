import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function NotFound(): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="nf">
      <h1 style={{ margin: 0 }}>404</h1>
      <p className="muted">{t('nf.body')}</p>
      <Link className="btn" to="/">{t('nf.home')}</Link>
    </div>
  );
}
