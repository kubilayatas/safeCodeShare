// İstemci ve sunucu arasında paylaşılan API tipleri
import type { BillingInfo, Entitlements, PlanId, PlanLimits, Usage, UserStatus } from './plans';
import type { LocaleCode } from './locales';

export type Role = 'admin' | 'teacher';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
  plan: PlanId;
  planExpiresAt: number | null;
  status: UserStatus;
  locale: LocaleCode | null; // arayüz dili tercihi (cihazlar arası taşınır)
};

export type MeResponse = { user: PublicUser; entitlements: Entitlements };

// Yönetici panelindeki kullanıcı satırı
export type AdminUser = PublicUser & {
  effectivePlan: PlanId;
  usage: Usage;
  lastLoginAt: number | null;
  signupSource: 'admin' | 'self';
  adminNote: string;
  limitsOverride: Partial<PlanLimits> | null;
  billing: (BillingInfo & { subscriptionId: string }) | null;
};

export type AdminStats = {
  users: number;
  activeUsers30d: number;
  proUsers: number;
  suspendedUsers: number;
  courses: number;
  pads: number;
  signups7d: number;
};

export type PadSummary = {
  id: string;
  title: string;
  language: string;
  updatedAt: number;
  lineCount: number;
  courseId: string | null;
  topicId: string | null;
  editEnabled: boolean;
  viewEnabled: boolean;
  visibleInCourse: boolean;
  visibleFrom: number | null;
  expiresAt: number | null;
  hasPassword: boolean;
  copyProtect: boolean;
  ocrProtect: number; // 0 kapalı, 1 hafif, 2 güçlü
  sortOrder: number;
};

export type PadFull = PadSummary & {
  ownerId: string;
  description: string;
  editToken: string;
  viewToken: string;
  contentText: string;
  createdAt: number;
};

export type Course = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  viewToken: string;
  pageEnabled: boolean;
  defaultCopyProtect: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Topic = {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  createdAt: number;
};

export type TreeTopic = {
  topic: Topic;
  pads: PadSummary[];
};

export type TreeCourse = {
  course: Course;
  topics: TreeTopic[];
  loosePads: PadSummary[];
};

export type TreeResponse = {
  courses: TreeCourse[];
  unassigned: PadSummary[];
};

export type AccessLevel = 'owner' | 'edit' | 'view' | 'none';
export type AccessChannel = 'yjs' | 'protected';

export type PublicViewInfo = {
  padId: string;
  title: string;
  language: string;
  courseTitle?: string;
  requiresPassword: boolean;
  protected: boolean;
  ocrProtect: number;
  locked: boolean;
  lineCount: number;
  updatedAt: number;
};

export type PublicEditInfo = {
  padId: string;
  title: string;
  language: string;
};

export type PublicCourseInfo = {
  course: { title: string; description: string };
  topics: Array<{
    title: string;
    pads: Array<{
      title: string;
      language: string;
      viewToken: string;
      updatedAt: number;
      lineCount: number;
      hasPassword: boolean;
      copyProtect: boolean;
    }>;
  }>;
  loosePads: Array<{
    title: string;
    language: string;
    viewToken: string;
    updatedAt: number;
    lineCount: number;
    hasPassword: boolean;
    copyProtect: boolean;
  }>;
};

export type VersionSummary = {
  id: number;
  padId: string;
  label: string | null;
  isAuto: boolean;
  language: string;
  createdBy: string | null;
  createdAt: number;
};

export type VersionFull = VersionSummary & {
  contentText: string;
};

export type ApiErrorBody = {
  error: string;
  code: string;
};