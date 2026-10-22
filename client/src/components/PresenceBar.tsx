import { useI18n } from '../i18n';

export type Presence = { owners: number; editors: number; viewers: number };

type Props = {
  presence: Presence;
  selfName: string;
  selfColor: string;
};

// İzleyici/düzenleyici sayacı ve kendini gösteren küçük rozet.
export default function PresenceBar({ presence, selfName, selfColor }: Props): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="presence-bar">
      <span
        className="avatar"
        style={{ background: selfColor }}
        title={selfName}
      >
        {selfName.slice(0, 1).toUpperCase()}
      </span>
      <span className="muted" title={t('presence.participants')}>
        👁 {presence.viewers}
      </span>
      {presence.editors > 0 && (
        <span className="muted" title={t('presence.editors')}>
          ✏️ {presence.editors}
        </span>
      )}
      {presence.owners > 0 && (
        <span className="muted" title={t('presence.teachers')}>
          🎓 {presence.owners}
        </span>
      )}
    </div>
  );
}