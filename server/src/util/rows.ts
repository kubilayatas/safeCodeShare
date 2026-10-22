// Veritabanı satır tipleri ve ortak dönüşümler.
// Bu dosya; courses.ts, topics.ts, pads.ts ve (FAZ 6) public.ts tarafından paylaşılır.
import type { PadSummary } from '@safecodeshare/shared';

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'teacher';
  created_at: number;
  plan: string;
  plan_expires_at: number | null;
  status: string;
  limits_override: string | null;
  admin_note: string;
  last_login_at: number | null;
  signup_source: string;
  locale: string | null;
};

export type CourseRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  view_token: string;
  page_enabled: number;
  default_copy_protect: number;
  sort_order: number;
  archived: number;
  created_at: number;
  updated_at: number;
};

export type TopicRow = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at: number;
};

export type PadRow = {
  id: string;
  owner_id: string;
  course_id: string | null;
  topic_id: string | null;
  title: string;
  description: string;
  language: string;
  sort_order: number;
  edit_token: string;
  view_token: string;
  edit_enabled: number;
  view_enabled: number;
  visible_in_course: number;
  visible_from: number | null;
  expires_at: number | null;
  password_hash: string | null;
  ydoc: Buffer | null;
  content_text: string;
  line_count: number;
  copy_protect: number;
  ocr_protect: number;
  created_at: number;
  updated_at: number;
};

// PadSummary'ye dönüşüm (hasPassword: password_hash dolu mu?)
export function padSummary(row: PadRow): PadSummary {
  return {
    id: row.id,
    title: row.title,
    language: row.language,
    updatedAt: row.updated_at,
    lineCount: row.line_count,
    courseId: row.course_id,
    topicId: row.topic_id,
    editEnabled: !!row.edit_enabled,
    viewEnabled: !!row.view_enabled,
    visibleInCourse: !!row.visible_in_course,
    visibleFrom: row.visible_from,
    expiresAt: row.expires_at,
    hasPassword: !!row.password_hash,
    copyProtect: !!row.copy_protect,
    ocrProtect: row.ocr_protect ?? 0,
    sortOrder: row.sort_order
  };
}