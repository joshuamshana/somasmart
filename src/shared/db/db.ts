import Dexie, { type Table } from "dexie";
import type {
  AppSetting,
  AuditLog,
  Badge,
  Coupon,
  CurriculumCategory,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LessonBlock,
  LicenseGrant,
  Notification,
  Message,
  OutboxEvent,
  Payment,
  Progress,
  Quiz,
  QuizAttempt,
  School,
  Streak,
  User
} from "@/shared/types";
import { getDeviceId } from "@/shared/device";

export type LessonContent = {
  lessonId: string;
  blocks: LessonBlock[];
};

export class SomaSmartDB extends Dexie {
  users!: Table<User, string>;
  schools!: Table<School, string>;
  curriculumCategories!: Table<CurriculumCategory, string>;
  curriculumSubjects!: Table<CurriculumSubject, string>;
  lessons!: Table<Lesson, string>;
  lessonContents!: Table<LessonContent, string>;
  lessonAssets!: Table<LessonAsset, string>;
  quizzes!: Table<Quiz, string>;
  progress!: Table<Progress, string>;
  quizAttempts!: Table<QuizAttempt, string>;
  payments!: Table<Payment, string>;
  licenseGrants!: Table<LicenseGrant, string>;
  coupons!: Table<Coupon, string>;
  messages!: Table<Message, string>;
  notifications!: Table<Notification, string>;
  streaks!: Table<Streak, string>;
  badges!: Table<Badge, string>;
  auditLogs!: Table<AuditLog, string>;
  settings!: Table<AppSetting, string>;
  outboxEvents!: Table<OutboxEvent, string>;

  constructor() {
    super(getLocalDbName());
    this.version(1).stores({
      users: "id, role, status, username, schoolId, createdAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, createdAt",
      coupons: "code, active",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(2).stores({
      users: "id, role, status, username, schoolId, createdAt",
      schools: "id, code, createdAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, createdAt",
      coupons: "code, active",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(3).stores({
      users: "id, role, status, username, schoolId, createdAt",
      schools: "id, code, createdAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, createdAt",
      coupons: "code, active",
      messages: "id, fromUserId, toUserId, status, createdAt",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(4).stores({
      users: "id, role, status, username, schoolId, createdAt",
      schools: "id, code, createdAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, createdAt",
      coupons: "code, active",
      messages: "id, fromUserId, toUserId, status, createdAt",
      notifications: "id, userId, type, createdAt, readAt",
      streaks: "studentId, lastActiveDate, updatedAt",
      badges: "id, studentId, badgeId, earnedAt",
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      settings: "key, updatedAt",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(5).stores({
      users: "id, role, status, username, schoolId, createdAt",
      schools: "id, code, createdAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, sourcePaymentId, createdAt",
      coupons: "code, active",
      messages: "id, fromUserId, toUserId, status, createdAt",
      notifications: "id, userId, type, createdAt, readAt",
      streaks: "studentId, lastActiveDate, updatedAt",
      badges: "id, studentId, badgeId, earnedAt",
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      settings: "key, updatedAt",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(6).stores({
      users: "id, role, status, username, schoolId, createdAt, deletedAt",
      schools: "id, code, createdAt, deletedAt",
      curriculumCategories: "id, name, createdAt, updatedAt, deletedAt",
      curriculumSubjects: "id, categoryId, name, level, createdAt, updatedAt, deletedAt",
      lessons: "id, status, subject, level, language, createdByUserId, createdAt, updatedAt, deletedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, sourcePaymentId, createdAt, deletedAt",
      coupons: "code, active, deletedAt, batchId",
      messages: "id, fromUserId, toUserId, status, createdAt",
      notifications: "id, userId, type, createdAt, readAt",
      streaks: "studentId, lastActiveDate, updatedAt",
      badges: "id, studentId, badgeId, earnedAt",
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      settings: "key, updatedAt",
      outboxEvents: "id, type, syncStatus, createdAt"
    });

    this.version(7).stores({
      users: "id, role, status, username, schoolId, createdAt, deletedAt",
      schools: "id, code, createdAt, deletedAt",
      curriculumCategories: "id, name, createdAt, updatedAt, deletedAt",
      curriculumSubjects: "id, categoryId, name, level, createdAt, updatedAt, deletedAt",
      lessons:
        "id, status, subject, curriculumSubjectId, schoolId, level, language, createdByUserId, createdAt, updatedAt, deletedAt",
      lessonContents: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      quizAttempts: "id, studentId, quizId, createdAt",
      payments: "id, studentId, status, createdAt",
      licenseGrants: "id, studentId, sourcePaymentId, createdAt, deletedAt",
      coupons: "code, active, deletedAt, batchId",
      messages: "id, fromUserId, toUserId, status, createdAt",
      notifications: "id, userId, type, createdAt, readAt",
      streaks: "studentId, lastActiveDate, updatedAt",
      badges: "id, studentId, badgeId, earnedAt",
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      settings: "key, updatedAt",
      outboxEvents: "id, type, syncStatus, createdAt"
    });
  }
}

function getLocalDbName() {
  const device = getDeviceId();
  return device ? `somasmart_${device}` : "somasmart";
}

export const db = new SomaSmartDB();
