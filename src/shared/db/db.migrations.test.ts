import Dexie from "dexie";
import { describe, it, expect } from "vitest";
import { SomaSmartDB } from "@/shared/db/db";
import "fake-indexeddb/auto";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe("SomaSmartDB migrations", () => {
  it("upgrades v8 lesson text blocks to include text variant", async () => {
    const dbName = `somasmart_migration_${Date.now()}`;
    const legacy = new Dexie(dbName);

    legacy.version(7).stores({
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

    await legacy.open();
    await legacy.table("lessonContents").put({
      lessonId: "lesson_1",
      blocks: [{ id: "b1", type: "text", text: "Legacy text block" }]
    });
    await legacy.close();

    const upgraded = new SomaSmartDB(dbName);
    await upgraded.open();

    const content = await upgraded.lessonContents.get("lesson_1");
    expect(content?.blocks?.[0]).toMatchObject({ type: "text", variant: "body", text: "Legacy text block" });

    await upgraded.close();
    await Dexie.delete(dbName);
  });

  it("upgrades v10 users and preserves optional KYC payload", async () => {
    const dbName = `somasmart_migration_v11_${Date.now()}`;
    const legacy = new Dexie(dbName);

    legacy.version(10).stores({
      users: "id, role, status, username, schoolId, createdAt, deletedAt",
      schools: "id, code, createdAt, deletedAt",
      curriculumCategories: "id, name, createdAt, updatedAt, deletedAt",
      curriculumLevels: "id, name, sortOrder, createdAt, updatedAt, deletedAt",
      curriculumClasses: "id, levelId, name, sortOrder, createdAt, updatedAt, deletedAt",
      curriculumSubjects: "id, classId, name, createdAt, updatedAt, deletedAt, categoryId",
      lessons:
        "id, status, subject, className, curriculumSubjectId, curriculumClassId, curriculumLevelId, schoolId, level, language, createdByUserId, createdAt, updatedAt, deletedAt",
      lessonContents: "lessonId",
      lessonContentsV2: "lessonId",
      lessonAssets: "id, lessonId, kind, createdAt",
      quizzes: "id, lessonId",
      progress: "id, studentId, lessonId, lastSeenAt",
      lessonStepProgress: "id, studentId, lessonId, stepKey, completedAt",
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

    await legacy.open();
    await legacy.table("users").bulkPut([
      {
        id: "user_legacy_plain",
        role: "student",
        status: "active",
        displayName: "Legacy Plain",
        username: "legacy_plain",
        passwordHash: "hash",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "user_legacy_kyc",
        role: "student",
        status: "active",
        displayName: "Legacy Kyc",
        username: "legacy_kyc",
        passwordHash: "hash",
        kyc: {
          mobile: "+255700000001",
          address: { country: "TZ", region: "Dar", street: "Mtaa 1" },
          dateOfBirth: "2010-01-01",
          studentLevel: "secondary",
          updatedAt: "2026-01-01T00:00:00.000Z"
        },
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);
    await legacy.close();

    const upgraded = new SomaSmartDB(dbName);
    await upgraded.open();

    const plain = await upgraded.users.get("user_legacy_plain");
    const withKyc = await upgraded.users.get("user_legacy_kyc");
    expect(plain?.kyc).toBeUndefined();
    expect(withKyc?.kyc?.mobile).toBe("+255700000001");
    expect(withKyc?.kyc?.address.country).toBe("TZ");

    await upgraded.close();
    await Dexie.delete(dbName);
  });
});
