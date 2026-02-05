import Dexie, { type Table } from "dexie";
import type {
  AuditLog,
  AppSetting,
  Coupon,
  CurriculumCategory,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LicenseGrant,
  Message,
  Notification,
  Payment,
  Progress,
  Quiz,
  QuizAttempt,
  School,
  User
} from "@/shared/types";
import type { LessonContent } from "@/shared/db/db";
import { getServerId } from "@/shared/server";

export type ServerChange = {
  id: string;
  createdAt: string;
  entityType:
    | "user"
    | "school"
    | "setting"
    | "curriculumCategory"
    | "curriculumSubject"
    | "lesson"
    | "lessonContent"
    | "lessonAsset"
    | "quiz"
    | "progress"
    | "quizAttempt"
    | "payment"
    | "licenseGrant"
    | "coupon"
    | "message"
    | "notification"
    | "auditLog";
  entityId: string;
};

export class SomaSmartMockServerDB extends Dexie {
  users!: Table<User, string>;
  schools!: Table<School, string>;
  settings!: Table<AppSetting, string>;
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
  auditLogs!: Table<AuditLog, string>;
  changes!: Table<ServerChange, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
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
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      changes: "id, createdAt, entityType, entityId"
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
      licenseGrants: "id, studentId, sourcePaymentId, createdAt",
      coupons: "code, active",
      messages: "id, fromUserId, toUserId, status, createdAt",
      notifications: "id, userId, type, createdAt, readAt",
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      changes: "id, createdAt, entityType, entityId"
    });

    this.version(3).stores({
      users: "id, role, status, username, schoolId, createdAt",
      schools: "id, code, createdAt",
      settings: "key, updatedAt",
      curriculumCategories: "id, name, updatedAt",
      curriculumSubjects: "id, categoryId, level, updatedAt",
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
      auditLogs: "id, actorUserId, action, entityType, entityId, createdAt",
      changes: "id, createdAt, entityType, entityId"
    });
  }
}

function getServerDbName() {
  const server = getServerId();
  return server ? `somasmart_server_mock_${server}` : "somasmart_server_mock";
}

export const serverDb = new SomaSmartMockServerDB(getServerDbName());
