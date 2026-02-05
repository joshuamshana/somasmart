import type {
  AuditLog,
  AppSetting,
  Coupon,
  CurriculumCategory,
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LicenseGrant,
  Message,
  Notification,
  OutboxEvent,
  Payment,
  Progress,
  Quiz,
  QuizAttempt,
  School,
  User
} from "@/shared/types";
import type { LessonContent } from "@/shared/db/db";

export type PushResult = {
  ok: boolean;
  pushedCount: number;
  errorsByEventId?: Record<string, string>;
};

export type PullBundle = {
  serverTime: string;
  users?: User[];
  schools?: School[];
  settings?: AppSetting[];
  curriculumCategories?: CurriculumCategory[];
  curriculumLevels?: CurriculumLevel[];
  curriculumClasses?: CurriculumClass[];
  curriculumSubjects?: CurriculumSubject[];
  lessons?: Lesson[];
  lessonContents?: LessonContent[];
  lessonAssets?: LessonAsset[];
  quizzes?: Quiz[];
  progress?: Progress[];
  quizAttempts?: QuizAttempt[];
  payments?: Payment[];
  licenseGrants?: LicenseGrant[];
  coupons?: Coupon[];
  messages?: Message[];
  notifications?: Notification[];
  auditLogs?: AuditLog[];
};

export interface SyncAdapter {
  pushEvents(events: OutboxEvent[]): Promise<PushResult>;
  pullChanges(since?: string): Promise<PullBundle>;
}
