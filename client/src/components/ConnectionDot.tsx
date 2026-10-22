import { useI18n } from '../i18n';

type Props = {
  status: 'connected' | 'connecting' | 'disconnected';
};

export default function ConnectionDot({ status }: Props): JSX.Element {
  const { t } = useI18n();
  const cls = status === 'connected' ? 'dot dot-ok' : status === 'connecting' ? 'dot dot-warn' : 'dot dot-err';
  const title = t(status === 'connected' ? 'conn.connected' : status === 'connecting' ? 'conn.connecting' : 'conn.disconnected');
  return <span className={cls} title={title} aria-label={title} role="img" />;
}
