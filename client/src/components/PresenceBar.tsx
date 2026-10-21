export type Presence = { owners: number; editors: number; viewers: number };

type Props = {
  presence: Presence;
  selfName: string;
  selfColor: string;
};

// İzleyici/düzenleyici sayacı ve kendini gösteren küçük rozet.
export default function PresenceBar({ presence, selfName, selfColor }: Props): JSX.Element {
  return (
    <div className="presence-bar">
      <span
        className="avatar"
        style={{ background: selfColor }}
        title={selfName}
      >
        {selfName.slice(0, 1).toUpperCase()}
      </span>
      <span className="muted" title="Katılımcı sayısı">
        👁 {presence.viewers}
      </span>
      {presence.editors > 0 && (
        <span className="muted" title="Düzenleyen sayısı">
          ✏️ {presence.editors}
        </span>
      )}
      {presence.owners > 0 && (
        <span className="muted" title="Öğretmen">
          🎓 {presence.owners}
        </span>
      )}
    </div>
  );
}