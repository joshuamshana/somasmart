import Dexie, { type Table } from "dexie";
import type {
  AppSetting,
  AuditLog,
  Badge,
  Coupon,
  CurriculumCategory,
  CurriculumClass,
  CurriculumLevel,
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
  curriculumLevels!: Table<CurriculumLevel, string>;
  curriculumClasses!: Table<CurriculumClass, string>;
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

    this.version(8)
      .stores({
        users: "id, role, status, username, schoolId, createdAt, deletedAt",
        schools: "id, code, createdAt, deletedAt",
        curriculumCategories: "id, name, createdAt, updatedAt, deletedAt",
        curriculumLevels: "id, name, sortOrder, createdAt, updatedAt, deletedAt",
        curriculumClasses: "id, levelId, name, sortOrder, createdAt, updatedAt, deletedAt",
        curriculumSubjects: "id, classId, name, createdAt, updatedAt, deletedAt, categoryId",
        lessons:
          "id, status, subject, className, curriculumSubjectId, curriculumClassId, curriculumLevelId, schoolId, level, language, createdByUserId, createdAt, updatedAt, deletedAt",
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
      })
      .upgrade(async (tx) => {
        const nowIso = () => new Date().toISOString();

        const defaultLevels: CurriculumLevel[] = [
          { id: "lvl_seed_preschool", name: "Preschool", sortOrder: 1, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "lvl_seed_primary", name: "Primary", sortOrder: 2, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "lvl_seed_secondary", name: "Secondary", sortOrder: 3, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "lvl_seed_high", name: "High", sortOrder: 4, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "lvl_seed_university", name: "University", sortOrder: 5, createdAt: nowIso(), updatedAt: nowIso() }
        ];

        const defaultClasses: CurriculumClass[] = [
          { id: "cls_seed_preschool_1", levelId: "lvl_seed_preschool", name: "Pre-1", sortOrder: 1, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "cls_seed_preschool_2", levelId: "lvl_seed_preschool", name: "Pre-2", sortOrder: 2, createdAt: nowIso(), updatedAt: nowIso() },
          ...Array.from({ length: 7 }).map((_, i) => ({
            id: `cls_seed_primary_${i + 1}`,
            levelId: "lvl_seed_primary",
            name: `Class ${i + 1}`,
            sortOrder: i + 1,
            createdAt: nowIso(),
            updatedAt: nowIso()
          })),
          ...Array.from({ length: 4 }).map((_, i) => ({
            id: `cls_seed_secondary_${i + 1}`,
            levelId: "lvl_seed_secondary",
            name: `Form ${i + 1}`,
            sortOrder: i + 1,
            createdAt: nowIso(),
            updatedAt: nowIso()
          })),
          { id: "cls_seed_high_5", levelId: "lvl_seed_high", name: "Form 5", sortOrder: 5, createdAt: nowIso(), updatedAt: nowIso() },
          { id: "cls_seed_high_6", levelId: "lvl_seed_high", name: "Form 6", sortOrder: 6, createdAt: nowIso(), updatedAt: nowIso() },
          ...Array.from({ length: 4 }).map((_, i) => ({
            id: `cls_seed_university_${i + 1}`,
            levelId: "lvl_seed_university",
            name: `Year ${i + 1}`,
            sortOrder: i + 1,
            createdAt: nowIso(),
            updatedAt: nowIso()
          }))
        ];

        const defaultClassIdByLevelName: Record<string, string> = {
          preschool: "cls_seed_preschool_1",
          primary: "cls_seed_primary_1",
          secondary: "cls_seed_secondary_1",
          high: "cls_seed_high_5",
          university: "cls_seed_university_1"
        };

        const levelsTable = tx.table("curriculumLevels") as unknown as Table<CurriculumLevel, string>;
        const classesTable = tx.table("curriculumClasses") as unknown as Table<CurriculumClass, string>;
        const subjectsTable = tx.table("curriculumSubjects") as unknown as Table<any, string>;
        const lessonsTable = tx.table("lessons") as unknown as Table<any, string>;
        const contentsTable = tx.table("lessonContents") as unknown as Table<any, string>;

        const existingLevelCount = await levelsTable.count();
        if (existingLevelCount === 0) {
          await levelsTable.bulkPut(defaultLevels);
        }

        const existingClassCount = await classesTable.count();
        if (existingClassCount === 0) {
          await classesTable.bulkPut(defaultClasses);
        }

        const levels = (await levelsTable.toArray()).filter((l) => !l.deletedAt);
        const classes = (await classesTable.toArray()).filter((c) => !c.deletedAt);

        const levelByName = new Map<string, CurriculumLevel>();
        for (const l of levels) levelByName.set(l.name.toLowerCase(), l);

        const classById = new Map<string, CurriculumClass>();
        for (const c of classes) classById.set(c.id, c);

        const subjects = await subjectsTable.toArray();
        for (const s of subjects) {
          if (s.classId) continue;
          const legacyLevel = String(s.level ?? "Primary");
          const levelRow = levelByName.get(legacyLevel.toLowerCase()) ?? levelByName.get("primary")!;
          const defaultClassId =
            defaultClassIdByLevelName[levelRow.name.toLowerCase()] ?? defaultClassIdByLevelName["primary"];
          const next: any = {
            id: s.id,
            classId: defaultClassId,
            name: s.name,
            categoryId: s.categoryId ?? undefined,
            createdAt: s.createdAt ?? nowIso(),
            updatedAt: nowIso(),
            deletedAt: s.deletedAt ?? undefined
          };
          await subjectsTable.put(next);
        }

        const subjectsById = new Map<string, any>();
        for (const s of await subjectsTable.toArray()) subjectsById.set(s.id, s);

        const lessons = await lessonsTable.toArray();
        for (const l of lessons) {
          const levelName = String(l.level ?? "Primary");
          const levelRow = levelByName.get(levelName.toLowerCase()) ?? levelByName.get("primary")!;
          const curriculumLevelId = l.curriculumLevelId ?? levelRow.id;

          let curriculumClassId: string | undefined = l.curriculumClassId;
          if (!curriculumClassId) {
            const subj = l.curriculumSubjectId ? subjectsById.get(l.curriculumSubjectId) : null;
            if (subj?.classId) curriculumClassId = subj.classId;
            else curriculumClassId = defaultClassIdByLevelName[levelRow.name.toLowerCase()] ?? defaultClassIdByLevelName["primary"];
          }

          const cls = curriculumClassId ? classById.get(curriculumClassId) : null;
          const className = l.className ?? (cls ? cls.name : undefined);

          if (l.curriculumLevelId === curriculumLevelId && l.curriculumClassId === curriculumClassId && l.className === className) continue;
          await lessonsTable.put({
            ...l,
            curriculumLevelId,
            curriculumClassId,
            className
          });
        }

        const contents = await contentsTable.toArray();
        for (const c of contents) {
          const blocks = (c.blocks ?? []) as any[];
          let changed = false;
          const nextBlocks = blocks.map((b) => {
            if (b?.type !== "text") return b;
            if (b.variant) return b;
            changed = true;
            return { ...b, variant: "body" };
          });
          if (!changed) continue;
          await contentsTable.put({ ...c, blocks: nextBlocks });
        }
      });
  }
}

function getLocalDbName() {
  const device = getDeviceId();
  return device ? `somasmart_${device}` : "somasmart";
}

export const db = new SomaSmartDB();
