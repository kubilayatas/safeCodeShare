import type { PadSummary } from '@safecodeshare/shared';
import { languageLabel } from '@safecodeshare/shared';

type Props = {
  pad: PadSummary;
  onOpen: () => void;
  onCopyView: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce güncellendi`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} saat önce güncellendi`;
  const d = Math.floor(h / 24);
  return `${d} gün önce güncellendi`;
}

export default function PadCard({
  pad,
  onOpen,
  onCopyView,
  onDuplicate,
  onMove,
  onDelete,
  onShare
}: Props): JSX.Element {
  const expired = pad.expiresAt != null && pad.expiresAt < Date.now();
  const notYetVisible = pad.visibleFrom != null && pad.visibleFrom > Date.now();

  return (
    <div className="pad-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <div className="pad-card-head">
        <div className="pad-card-title">{pad.title}</div>
        <div className="pad-card-badges">
          {pad.hasPassword && <span className="badge" title="Şifreli">🔒</span>}
          {pad.editEnabled && <span className="badge" title="Düzenleme açık">✏️</span>}
          {!pad.visibleInCourse && <span className="badge" title="Ders sayfasında gizli">🙈</span>}
          {notYetVisible && <span className="badge" title="Belirli saatten sonra görünür">⏰</span>}
          {pad.copyProtect && <span className="badge" title="Kopyalama koruması açık">🛡</span>}
          {pad.copyProtect && pad.ocrProtect > 0 && (
            <span className="badge" title={`AI/OCR koruması: ${pad.ocrProtect === 2 ? 'güçlü' : 'hafif'}`}>🤖</span>
          )}
          {expired && <span className="badge" title="Süresi dolmuş">⌛</span>}
        </div>
      </div>

      <div className="pad-card-meta muted">
        <span className="lang-badge">{languageLabel(pad.language)}</span>
        <span>·</span>
        <span>{pad.lineCount} satır</span>
        <span>·</span>
        <span>{relativeTime(pad.updatedAt)}</span>
      </div>

      <div className="pad-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm" onClick={onOpen}>Aç</button>
        <button className="btn btn-sm" onClick={onCopyView}>İzleme linkini kopyala</button>
        <button className="btn btn-sm" onClick={onShare}>Paylaş</button>
        <button className="btn btn-sm" onClick={onDuplicate}>Çoğalt</button>
        <button className="btn btn-sm" onClick={onMove}>Taşı</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>Sil</button>
      </div>
    </div>
  );
}