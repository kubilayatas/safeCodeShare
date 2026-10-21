import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PadSummary,
  PublicUser,
  TreeResponse
} from '@kodsinif/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import CourseTree from '../components/CourseTree';
import PadCard from '../components/PadCard';
import LanguagePicker from '../components/LanguagePicker';
import AdBanner from '../components/AdBanner';

type Props = {
  user: PublicUser;
  onLogout: () => void;
};

type Selection =
  | { kind: 'none' }
  | { kind: 'course'; courseId: string }
  | { kind: 'topic'; courseId: string; topicId: string }
  | { kind: 'pad'; padId: string };

type CreatePadModal = {
  open: boolean;
  title: string;
  language: string;
  courseId: string | null;
  topicId: string | null;
};

type MoveModal = {
  open: boolean;
  padId: string;
  courseId: string | null;
  topicId: string | null;
};

export default function Dashboard({ user, onLogout }: Props): JSX.Element {
  const toast = useToast();
  const navigate = useNavigate();

  const [tree, setTree] = useState<TreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PadSummary[] | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  const [createModal, setCreateModal] = useState<CreatePadModal>({
    open: false,
    title: '',
    language: 'python',
    courseId: null,
    topicId: null
  });

  const [moveModal, setMoveModal] = useState<MoveModal>({
    open: false,
    padId: '',
    courseId: null,
    topicId: null
  });

  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const searchTimer = useRef<number | null>(null);

  const loadTree = useCallback(async (): Promise<void> => {
    try {
      const data = await apiFetch<TreeResponse>('/api/tree');
      setTree(data);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Ağaç yüklenemedi';
      toast.show(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // Arama (debounce)
  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      try {
        const r = await apiFetch<{ pads: PadSummary[] }>(`/api/pads?q=${encodeURIComponent(q)}`);
        setSearchResults(r.pads);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Arama başarısız';
        toast.show(msg, 'error');
      }
    }, 250);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [search, toast]);

  // --- Türetilmiş görünüm ---
  const currentList = useMemo((): PadSummary[] => {
    if (searchResults) return searchResults;
    if (!tree) return [];
    if (selection.kind === 'pad') {
      const all = collectAllPads(tree);
      const pad = all.find((p) => p.id === selection.padId);
      return pad ? [pad] : [];
    }
    if (selection.kind === 'course') {
      const c = tree.courses.find((x) => x.course.id === selection.courseId);
      if (!c) return [];
      const out: PadSummary[] = [];
      for (const t of c.topics) out.push(...t.pads);
      out.push(...c.loosePads);
      return out;
    }
    if (selection.kind === 'topic') {
      const c = tree.courses.find((x) => x.course.id === selection.courseId);
      const t = c?.topics.find((x) => x.topic.id === selection.topicId);
      return t ? t.pads : [];
    }
    return tree.unassigned;
  }, [tree, selection, searchResults]);

  // --- Yardımcılar ---

  function defaultTarget(): { courseId: string | null; topicId: string | null } {
    if (selection.kind === 'topic') {
      return { courseId: selection.courseId, topicId: selection.topicId };
    }
    if (selection.kind === 'course') {
      return { courseId: selection.courseId, topicId: null };
    }
    return { courseId: null, topicId: null };
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // yut
    }
    toast.show('Çıkış yapıldı', 'success');
    onLogout();
    navigate('/login', { replace: true });
  }

  async function createCourse(): Promise<void> {
    const title = window.prompt('Ders başlığı (en fazla 80 karakter):');
    if (!title) return;
    setCreatingCourse(true);
    try {
      await apiFetch('/api/courses', { method: 'POST', body: { title: title.trim() } });
      toast.show('Ders oluşturuldu', 'success');
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Ders oluşturulamadı';
      toast.show(msg, 'error');
    } finally {
      setCreatingCourse(false);
    }
  }

  async function createTopic(courseId: string): Promise<void> {
    const title = window.prompt('Konu başlığı:');
    if (!title) return;
    try {
      await apiFetch(`/api/courses/${courseId}/topics`, { method: 'POST', body: { title: title.trim() } });
      toast.show('Konu oluşturuldu', 'success');
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Konu oluşturulamadı';
      toast.show(msg, 'error');
    }
  }

  async function submitCreatePad(): Promise<void> {
    const t = createModal.title.trim();
    if (!t) {
      toast.show('Başlık gerekli', 'error');
      return;
    }
    try {
      const res = await apiFetch<{ pad: { id: string } }>('/api/pads', {
        method: 'POST',
        body: {
          title: t,
          language: createModal.language,
          courseId: createModal.courseId,
          topicId: createModal.topicId
        }
      });
      toast.show('Kod oluşturuldu', 'success');
      setCreateModal((m) => ({ ...m, open: false, title: '' }));
      await loadTree();
      navigate(`/pad/${res.pad.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kod oluşturulamadı';
      toast.show(msg, 'error');
    }
  }

  async function renameCourse(id: string, current: string): Promise<void> {
    const next = window.prompt('Yeni başlık:', current);
    if (!next || next === current) return;
    await patch(`/api/courses/${id}`, { title: next.trim() }, 'Ders yeniden adlandırıldı');
  }

  async function renameTopic(id: string, current: string): Promise<void> {
    const next = window.prompt('Yeni başlık:', current);
    if (!next || next === current) return;
    await patch(`/api/topics/${id}`, { title: next.trim() }, 'Konu yeniden adlandırıldı');
  }

  async function renamePad(id: string, current: string): Promise<void> {
    const next = window.prompt('Yeni başlık:', current);
    if (!next || next === current) return;
    await patch(`/api/pads/${id}`, { title: next.trim() }, 'Kod yeniden adlandırıldı');
  }

  async function patch(path: string, body: unknown, successMsg: string): Promise<void> {
    try {
      await apiFetch(path, { method: 'PATCH', body });
      toast.show(successMsg, 'success');
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'İşlem başarısız';
      toast.show(msg, 'error');
    }
  }

  function askDeleteCourse(id: string, title: string): void {
    setConfirm({
      open: true,
      title: 'Dersi sil',
      message: `"${title}" dersini silmek istediğinize emin misiniz? Kodlar silinmez, "Derssiz" klasörüne taşınır.`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        await del(`/api/courses/${id}`, 'Ders silindi');
      }
    });
  }

  function askDeleteTopic(id: string, title: string): void {
    setConfirm({
      open: true,
      title: 'Konuyu sil',
      message: `"${title}" konusunu silmek istediğinize emin misiniz? Kodlar dersin konusuz bölümüne taşınır.`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        await del(`/api/topics/${id}`, 'Konu silindi');
      }
    });
  }

  function askDeletePad(id: string, title: string): void {
    setConfirm({
      open: true,
      title: 'Kodu sil',
      message: `"${title}" kalıcı olarak silinecek. Emin misiniz?`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        await del(`/api/pads/${id}`, 'Kod silindi');
      }
    });
  }

  async function del(path: string, successMsg: string): Promise<void> {
    try {
      await apiFetch(path, { method: 'DELETE' });
      toast.show(successMsg, 'success');
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Silme başarısız';
      toast.show(msg, 'error');
    }
  }

  // Sıralama: seçili listede yukarı/aşağı taşı ve reorder çağır
  async function moveUp(kind: 'course' | 'topic' | 'pad', id: string): Promise<void> {
    await reorder(kind, id, -1);
  }
  async function moveDown(kind: 'course' | 'topic' | 'pad', id: string): Promise<void> {
    await reorder(kind, id, +1);
  }

  async function reorder(kind: 'course' | 'topic' | 'pad', id: string, delta: number): Promise<void> {
    if (!tree) return;
    let ids: string[] = [];

    if (kind === 'course') {
      ids = tree.courses.map((c) => c.course.id);
    } else if (kind === 'topic') {
      // id'nin bulunduğu dersin konu sırası
      for (const c of tree.courses) {
        const idx = c.topics.findIndex((t) => t.topic.id === id);
        if (idx >= 0) {
          ids = c.topics.map((t) => t.topic.id);
          break;
        }
      }
    } else {
      // pad: aynı ebeveyn altındaki padler
      for (const c of tree.courses) {
        for (const t of c.topics) {
          const idx = t.pads.findIndex((p) => p.id === id);
          if (idx >= 0) {
            ids = t.pads.map((p) => p.id);
            break;
          }
        }
        if (ids.length) break;
        const li = c.loosePads.findIndex((p) => p.id === id);
        if (li >= 0) {
          ids = c.loosePads.map((p) => p.id);
          break;
        }
      }
      if (!ids.length) {
        const ui = tree.unassigned.findIndex((p) => p.id === id);
        if (ui >= 0) ids = tree.unassigned.map((p) => p.id);
      }
    }

    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= ids.length) return;
    const swapped = [...ids];
    [swapped[idx], swapped[next]] = [swapped[next], swapped[idx]];

    try {
      await apiFetch('/api/reorder', { method: 'POST', body: { kind, ids: swapped } });
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Sıralama başarısız';
      toast.show(msg, 'error');
    }
  }

  async function copyCourseLink(viewToken: string): Promise<void> {
    const url = `${window.location.origin}/c/${viewToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.show('Ders linki kopyalandı', 'success');
    } catch {
      toast.show(url, 'info');
    }
  }

  async function exportCourse(courseId: string): Promise<void> {
    try {
      const res = await fetch(`/api/courses/${courseId}/export.zip`, { credentials: 'include' });
      if (!res.ok) throw new Error('İndirme başarısız');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ders.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'İndirme başarısız';
      toast.show(msg, 'error');
    }
  }

  async function openPad(padId: string): Promise<void> {
    navigate(`/pad/${padId}`);
  }

  async function copyPadViewLink(padId: string): Promise<void> {
    try {
      const res = await apiFetch<{ pad: { viewToken: string } }>(`/api/pads/${padId}`);
      const url = `${window.location.origin}/v/${res.pad.viewToken}`;
      await navigator.clipboard.writeText(url);
      toast.show('İzleme linki kopyalandı', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kopyalanamadı';
      toast.show(msg, 'error');
    }
  }

  async function duplicatePad(padId: string): Promise<void> {
    try {
      await apiFetch(`/api/pads/${padId}/duplicate`, { method: 'POST' });
      toast.show('Kod çoğaltıldı', 'success');
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Çoğaltma başarısız';
      toast.show(msg, 'error');
    }
  }

  function openMovePad(padId: string): void {
    setMoveModal({ open: true, padId, courseId: null, topicId: null });
  }

  async function submitMove(): Promise<void> {
    try {
      await apiFetch(`/api/pads/${moveModal.padId}`, {
        method: 'PATCH',
        body: {
          courseId: moveModal.courseId,
          topicId: moveModal.topicId
        }
      });
      toast.show('Kod taşındı', 'success');
      setMoveModal((m) => ({ ...m, open: false }));
      await loadTree();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Taşıma başarısız';
      toast.show(msg, 'error');
    }
  }

  // Yeni kod penceresi aç
  function openCreateModal(): void {
    const t = defaultTarget();
    setCreateModal({
      open: true,
      title: '',
      language: 'python',
      courseId: t.courseId,
      topicId: t.topicId
    });
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  const headerTitle = (() => {
    if (search.trim()) return `Arama: "${search.trim()}"`;
    if (selection.kind === 'course' && tree) {
      const c = tree.courses.find((x) => x.course.id === selection.courseId);
      return c ? `📚 ${c.course.title}` : 'Ders';
    }
    if (selection.kind === 'topic' && tree) {
      const c = tree.courses.find((x) => x.course.id === selection.courseId);
      const t = c?.topics.find((x) => x.topic.id === selection.topicId);
      return t ? `📝 ${t.topic.title}` : 'Konu';
    }
    if (selection.kind === 'pad' && tree) {
      const p = collectAllPads(tree).find((x) => x.id === selection.padId);
      return p ? `💻 ${p.title}` : 'Kod';
    }
    return 'Derssiz kodlar';
  })();

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-side-head">
          <div className="brand">KodSınıf</div>
          <div className="muted" style={{ fontSize: 12 }}>{user.name}</div>
        </div>

        <div className="side-actions">
          <button className="btn btn-primary btn-sm" onClick={createCourse} disabled={creatingCourse}>
            + Ders
          </button>
          <button className="btn btn-sm" onClick={openCreateModal}>+ Yeni kod</button>
          <button className="btn btn-sm" onClick={() => navigate('/profile')}>Profil</button>
          {user.role === 'admin' && (
            <button className="btn btn-sm" onClick={() => navigate('/admin')}>Admin</button>
          )}
          <button className="btn btn-sm" onClick={logout}>Çıkış</button>
        </div>

        <input
          className="input"
          placeholder="Ara: başlık veya içerik"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginTop: 10, marginBottom: 10 }}
        />

        {tree && (
          <CourseTree
            courses={tree.courses}
            unassigned={tree.unassigned}
            selection={selection}
            onSelect={setSelection}
            onRenameCourse={renameCourse}
            onRenameTopic={renameTopic}
            onRenamePad={renamePad}
            onDeleteCourse={askDeleteCourse}
            onDeleteTopic={askDeleteTopic}
            onDeletePad={askDeletePad}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onCopyCourseLink={copyCourseLink}
            onExportCourse={exportCourse}
            onNewTopic={createTopic}
          />
        )}
      </aside>

      <main className="dash-main">
        <div className="dash-header">
          <h1>{headerTitle}</h1>
          <div className="muted">{currentList.length} kod</div>
        </div>

        {currentList.length === 0 ? (
          <p className="muted">Bu bölümde kod yok. "+ Yeni kod" ile oluşturabilirsin.</p>
        ) : (
          <div className="pad-grid">
            {currentList.map((p) => (
              <PadCard
                key={p.id}
                pad={p}
                onOpen={() => void openPad(p.id)}
                onCopyView={() => void copyPadViewLink(p.id)}
                onDuplicate={() => void duplicatePad(p.id)}
                onMove={() => openMovePad(p.id)}
                onDelete={() => askDeletePad(p.id, p.title)}
                onShare={() => navigate(`/pad/${p.id}?share=1`)}
              />
            ))}
          </div>
        )}

        <AdBanner className="course-ad-banner" format="auto" />
      </main>

      {/* Yeni kod penceresi */}
      {createModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 style={{ marginTop: 0 }}>Yeni kod</h3>
            <div className="field">
              <label>Başlık</label>
              <input
                className="input"
                autoFocus
                value={createModal.title}
                onChange={(e) => setCreateModal((m) => ({ ...m, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className="field">
              <label>Dil</label>
              <LanguagePicker
                value={createModal.language}
                onChange={(id) => setCreateModal((m) => ({ ...m, language: id }))}
              />
            </div>
            <div className="field">
              <label>Ders</label>
              <select
                className="select"
                value={createModal.courseId ?? ''}
                onChange={(e) => {
                  const cid = e.target.value || null;
                  setCreateModal((m) => ({ ...m, courseId: cid, topicId: null }));
                }}
              >
                <option value="">— Derssiz —</option>
                {tree?.courses.map((c) => (
                  <option key={c.course.id} value={c.course.id}>{c.course.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Konu</label>
              <select
                className="select"
                value={createModal.topicId ?? ''}
                onChange={(e) => setCreateModal((m) => ({ ...m, topicId: e.target.value || null }))}
                disabled={!createModal.courseId}
              >
                <option value="">— Konusuz —</option>
                {tree?.courses
                  .find((c) => c.course.id === createModal.courseId)
                  ?.topics.map((t) => (
                    <option key={t.topic.id} value={t.topic.id}>{t.topic.title}</option>
                  ))}
              </select>
            </div>
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => setCreateModal((m) => ({ ...m, open: false }))}
              >
                Vazgeç
              </button>
              <button className="btn btn-primary" onClick={() => void submitCreatePad()}>
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Taşı penceresi */}
      {moveModal.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 style={{ marginTop: 0 }}>Kodu taşı</h3>
            <div className="field">
              <label>Hedef ders</label>
              <select
                className="select"
                value={moveModal.courseId ?? ''}
                onChange={(e) => setMoveModal((m) => ({ ...m, courseId: e.target.value || null, topicId: null }))}
              >
                <option value="">— Derssiz —</option>
                {tree?.courses.map((c) => (
                  <option key={c.course.id} value={c.course.id}>{c.course.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Hedef konu</label>
              <select
                className="select"
                value={moveModal.topicId ?? ''}
                onChange={(e) => setMoveModal((m) => ({ ...m, topicId: e.target.value || null }))}
                disabled={!moveModal.courseId}
              >
                <option value="">— Konusuz —</option>
                {tree?.courses
                  .find((c) => c.course.id === moveModal.courseId)
                  ?.topics.map((t) => (
                    <option key={t.topic.id} value={t.topic.id}>{t.topic.title}</option>
                  ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setMoveModal((m) => ({ ...m, open: false }))}>Vazgeç</button>
              <button className="btn btn-primary" onClick={() => void submitMove()}>Taşı</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        danger
        confirmLabel="Sil"
      />
    </div>
  );
}

// Yardımcılar

function collectAllPads(tree: TreeResponse): PadSummary[] {
  const out: PadSummary[] = [];
  for (const c of tree.courses) {
    for (const t of c.topics) out.push(...t.pads);
    out.push(...c.loosePads);
  }
  out.push(...tree.unassigned);
  return out;
}