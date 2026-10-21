import { z } from 'zod';

// Kimlik doğrulama
export const EmailSchema = z.string().trim().toLowerCase().email('Geçerli bir e-posta girin').max(200);
export const PasswordSchema = z.string().min(8, 'Parola en az 8 karakter olmalı').max(200);

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Parola gerekli').max(200)
});

export const ChangePasswordSchema = z.object({
  current: z.string().min(1, 'Mevcut parola gerekli').max(200),
  next: PasswordSchema
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Ad en az 2 karakter olmalı').max(120),
  email: EmailSchema,
  password: PasswordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Kullanım koşullarını kabul etmelisiniz' }) }),
  // Bot tuzağı: gerçek kullanıcılar bu alanı görmez ve boş bırakır.
  website: z.string().max(0).optional()
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Ad gerekli').max(120)
});

// Admin
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().min(1).max(120),
  password: PasswordSchema,
  role: z.enum(['admin', 'teacher']),
  plan: z.enum(['free', 'pro']).optional()
});

const LimitsOverrideSchema = z
  .object({
    maxCourses: z.number().int().min(0).max(100000).nullable().optional(),
    maxPads: z.number().int().min(0).max(1000000).nullable().optional(),
    copyProtect: z.boolean().optional(),
    ocrProtect: z.boolean().optional(),
    passwordShares: z.boolean().optional(),
    scheduledShares: z.boolean().optional(),
    editLinks: z.boolean().optional(),
    versionHistory: z.boolean().optional(),
    exportZip: z.boolean().optional(),
    embed: z.boolean().optional(),
    beautify: z.boolean().optional()
  })
  .strict();

export const PlanLimitsSchema = z
  .object({
    maxCourses: z.number().int().min(0).max(100000).nullable(),
    maxPads: z.number().int().min(0).max(1000000).nullable(),
    copyProtect: z.boolean(),
    ocrProtect: z.boolean(),
    passwordShares: z.boolean(),
    scheduledShares: z.boolean(),
    editLinks: z.boolean(),
    versionHistory: z.boolean(),
    exportZip: z.boolean(),
    embed: z.boolean(),
    beautify: z.boolean()
  })
  .strict();

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['admin', 'teacher']).optional(),
  password: PasswordSchema.optional(),
  plan: z.enum(['free', 'pro']).optional(),
  planExpiresAt: z.number().int().nullable().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  limitsOverride: LimitsOverrideSchema.nullable().optional(),
  adminNote: z.string().max(2000).optional()
});

export const SiteSettingsSchema = z.object({
  registrationOpen: z.boolean().optional(),
  upgradeInfo: z.string().max(2000).optional(),
  plans: z.object({ free: PlanLimitsSchema, pro: PlanLimitsSchema }).optional()
});

// Ders / konu / pad
export const CreateCourseSchema = z.object({
  title: z.string().trim().min(1, 'Başlık gerekli').max(80),
  description: z.string().max(1000).optional()
});

export const UpdateCourseSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  description: z.string().max(1000).optional(),
  pageEnabled: z.boolean().optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  defaultCopyProtect: z.boolean().optional()
});

export const CreateTopicSchema = z.object({
  title: z.string().trim().min(1, 'Başlık gerekli').max(80)
});

export const UpdateTopicSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.number().int().optional()
});

export const CreatePadSchema = z.object({
  title: z.string().trim().min(1, 'Başlık gerekli').max(120),
  language: z.string().min(1).max(40),
  courseId: z.string().min(1).nullable().optional(),
  topicId: z.string().min(1).nullable().optional(),
  content: z.string().max(1024 * 1024).optional()
});

export const UpdatePadSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  language: z.string().min(1).max(40).optional(),
  courseId: z.string().min(1).nullable().optional(),
  topicId: z.string().min(1).nullable().optional(),
  editEnabled: z.boolean().optional(),
  viewEnabled: z.boolean().optional(),
  visibleInCourse: z.boolean().optional(),
  visibleFrom: z.number().int().nullable().optional(),
  expiresAt: z.number().int().nullable().optional(),
  // password: yeni parola (string) veya null (kaldır) veya undefined (değiştirme)
  password: z.union([z.string().min(1).max(200), z.null()]).optional(),
  copyProtect: z.boolean().optional(),
  ocrProtect: z.number().int().min(0).max(2).optional()
});

export const RotateTokensSchema = z.object({
  which: z.enum(['edit', 'view', 'both'])
});

export const ReorderSchema = z.object({
  kind: z.enum(['course', 'topic', 'pad']),
  ids: z.array(z.string().min(1)).max(2000)
});

// Sürümler
export const CreateVersionSchema = z.object({
  label: z.string().trim().max(120).optional()
});

// Biçimlendirme
export const FormatSchema = z.object({
  language: z.string().min(1).max(40),
  code: z.string().max(1024 * 1024),
  tabWidth: z.number().int().min(1).max(8).optional(),
  useTabs: z.boolean().optional()
});

// Public
export const UnlockSchema = z.object({
  password: z.string().min(1).max(200)
});

// Yardımcılar
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type CreatePadInput = z.infer<typeof CreatePadSchema>;
export type UpdatePadInput = z.infer<typeof UpdatePadSchema>;
export type FormatInput = z.infer<typeof FormatSchema>;