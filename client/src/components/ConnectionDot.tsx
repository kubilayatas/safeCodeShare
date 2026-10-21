type Props = {
  status: 'connected' | 'connecting' | 'disconnected';
};

export default function ConnectionDot({ status }: Props): JSX.Element {
  const cls =
    status === 'connected'
      ? 'dot dot-ok'
      : status === 'connecting'
        ? 'dot dot-warn'
        : 'dot dot-err';
  const title =
    status === 'connected'
      ? 'Bağlı'
      : status === 'connecting'
        ? 'Bağlanıyor…'
        : 'Bağlantı koptu';
  return <span className={cls} title={title} aria-label={title} />;
}