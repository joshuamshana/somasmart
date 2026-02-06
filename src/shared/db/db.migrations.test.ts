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
});
