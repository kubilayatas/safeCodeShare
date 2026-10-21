import { useState } from 'react';
import type { PadSummary, TreeCourse } from '@safecodeshare/shared';

type Selection =
  | { kind: 'none' }
  | { kind: 'course'; courseId: string }
  | { kind: 'topic'; courseId: string; topicId: string }
  | { kind: 'pad'; padId: string };

type Props = {
  courses: TreeCourse[];
  unassigned: PadSummary[];
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onRenameCourse: (id: string, current: string) => void;
  onRenameTopic: (id: string, current: string) => void;
  onRenamePad: (id: string, current: string) => void;
  onDeleteCourse: (id: string, title: string) => void;
  onDeleteTopic: (id: string, title: string) => void;
  onDeletePad: (id: string, title: string) => void;
  onMoveUp: (kind: 'course' | 'topic' | 'pad', id: string) => void;
  onMoveDown: (kind: 'course' | 'topic' | 'pad', id: string) => void;
  onCopyCourseLink: (viewToken: string) => void;
  onExportCourse: (id: string) => void;
  onNewTopic: (courseId: string) => void;
};

type NodeMenuProps = {
  onRename: () => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  extra?: JSX.Element;
};

function NodeMenu({ onRename, onUp, onDown, onDelete, extra }: NodeMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="node-menu">
      <button
        className="icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Menü"
      >
        ⋮
      </button>
      {open && (
        <div className="node-menu-pop" onClick={() => setOpen(false)}>
          <button onClick={onRename}>Yeniden adlandır</button>
          <button onClick={onUp}>Yukarı taşı</button>
          <button onClick={onDown}>Aşağı taşı</button>
          {extra}
          <button className="danger" onClick={onDelete}>Sil</button>
        </div>
      )}
    </div>
  );
}

export default function CourseTree(props: Props): JSX.Element {
  const { courses, unassigned, selection, onSelect } = props;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(key: string): void {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  return (
    <div className="tree">
      {courses.length === 0 && unassigned.length === 0 && (
        <p className="muted">Henüz ders veya kod yok. "+ Ders" ile başla.</p>
      )}

      {courses.map((tc) => {
        const isCourseSelected = selection.kind === 'course' && selection.courseId === tc.course.id;
        const courseCollapsed = collapsed[`c:${tc.course.id}`];
        return (
          <div key={tc.course.id} className="tree-course">
            <div
              className={`tree-row tree-row-course ${isCourseSelected ? 'selected' : ''}`}
              onClick={() => onSelect({ kind: 'course', courseId: tc.course.id })}
            >
              <button
                className="caret"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(`c:${tc.course.id}`);
                }}
                aria-label={courseCollapsed ? 'Aç' : 'Kapat'}
              >
                {courseCollapsed ? '▸' : '▾'}
              </button>
              <span className="tree-title">📚 {tc.course.title}</span>
              <NodeMenu
                onRename={() => props.onRenameCourse(tc.course.id, tc.course.title)}
                onUp={() => props.onMoveUp('course', tc.course.id)}
                onDown={() => props.onMoveDown('course', tc.course.id)}
                onDelete={() => props.onDeleteCourse(tc.course.id, tc.course.title)}
                extra={
                  <>
                    <button onClick={() => props.onCopyCourseLink(tc.course.viewToken)}>
                      Ders linkini kopyala
                    </button>
                    <button onClick={() => props.onExportCourse(tc.course.id)}>Zip indir</button>
                  </>
                }
              />
            </div>

            {!courseCollapsed && (
              <div className="tree-children">
                <button className="tree-new" onClick={() => props.onNewTopic(tc.course.id)}>
                  + Konu
                </button>

                {tc.topics.map(({ topic, pads }) => {
                  const isTopicSelected =
                    selection.kind === 'topic' && selection.topicId === topic.id;
                  const topicCollapsed = collapsed[`t:${topic.id}`];
                  return (
                    <div key={topic.id} className="tree-topic">
                      <div
                        className={`tree-row tree-row-topic ${isTopicSelected ? 'selected' : ''}`}
                        onClick={() =>
                          onSelect({ kind: 'topic', courseId: tc.course.id, topicId: topic.id })
                        }
                      >
                        <button
                          className="caret"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(`t:${topic.id}`);
                          }}
                        >
                          {topicCollapsed ? '▸' : '▾'}
                        </button>
                        <span className="tree-title">📝 {topic.title}</span>
                        <NodeMenu
                          onRename={() => props.onRenameTopic(topic.id, topic.title)}
                          onUp={() => props.onMoveUp('topic', topic.id)}
                          onDown={() => props.onMoveDown('topic', topic.id)}
                          onDelete={() => props.onDeleteTopic(topic.id, topic.title)}
                        />
                      </div>
                      {!topicCollapsed && (
                        <div className="tree-children">
                          {pads.map((p) => {
                            const isPadSelected = selection.kind === 'pad' && selection.padId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`tree-row tree-row-pad ${isPadSelected ? 'selected' : ''}`}
                                onClick={() => onSelect({ kind: 'pad', padId: p.id })}
                                onDoubleClick={() => props.onRenamePad(p.id, p.title)}
                              >
                                <span className="tree-title">💻 {p.title}</span>
                                <NodeMenu
                                  onRename={() => props.onRenamePad(p.id, p.title)}
                                  onUp={() => props.onMoveUp('pad', p.id)}
                                  onDown={() => props.onMoveDown('pad', p.id)}
                                  onDelete={() => props.onDeletePad(p.id, p.title)}
                                />
                              </div>
                            );
                          })}
                          {pads.length === 0 && <div className="muted" style={{ padding: '4px 8px' }}>— boş —</div>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {tc.loosePads.length > 0 && (
                  <div className="tree-loose">
                    <div className="tree-row-label">Konusuz kodlar</div>
                    {tc.loosePads.map((p) => {
                      const isPadSelected = selection.kind === 'pad' && selection.padId === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`tree-row tree-row-pad ${isPadSelected ? 'selected' : ''}`}
                          onClick={() => onSelect({ kind: 'pad', padId: p.id })}
                        >
                          <span className="tree-title">💻 {p.title}</span>
                          <NodeMenu
                            onRename={() => props.onRenamePad(p.id, p.title)}
                            onUp={() => props.onMoveUp('pad', p.id)}
                            onDown={() => props.onMoveDown('pad', p.id)}
                            onDelete={() => props.onDeletePad(p.id, p.title)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="tree-course">
          <div className="tree-row tree-row-course">
            <span className="tree-title">📂 Derssiz kodlar</span>
          </div>
          <div className="tree-children">
            {unassigned.map((p) => {
              const isPadSelected = selection.kind === 'pad' && selection.padId === p.id;
              return (
                <div
                  key={p.id}
                  className={`tree-row tree-row-pad ${isPadSelected ? 'selected' : ''}`}
                  onClick={() => onSelect({ kind: 'pad', padId: p.id })}
                >
                  <span className="tree-title">💻 {p.title}</span>
                  <NodeMenu
                    onRename={() => props.onRenamePad(p.id, p.title)}
                    onUp={() => props.onMoveUp('pad', p.id)}
                    onDown={() => props.onMoveDown('pad', p.id)}
                    onDelete={() => props.onDeletePad(p.id, p.title)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}