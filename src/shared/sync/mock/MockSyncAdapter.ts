import type { SyncAdapter, PushResult, PullBundle } from "@/shared/sync/SyncAdapter";
import { serverDb, type ServerChange } from "@/shared/sync/mock/serverDb";
import type {
  AppSetting,
  Coupon,
  CurriculumCategory,
  CurriculumSubject,
  Lesson,
  LessonAsset,
  LicenseGrant,
  Message,
  Notification,
  OutboxEvent,
  Payment,
  School,
  User
} from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function recordChange(change: Omit<ServerChange, "id" | "createdAt">) {
  await serverDb.changes.add({ id: newId("chg"), createdAt: nowIso(), ...change });
}

async function addNotification(n: Omit<Notification, "id" | "createdAt">) {
  const row: Notification = { id: newId("notif"), createdAt: nowIso(), ...n };
  await serverDb.notifications.add(row);
  await recordChange({ entityType: "notification", entityId: row.id });
  return row;
}

export class MockSyncAdapter implements SyncAdapter {
  async pushEvents(events: OutboxEvent[]): Promise<PushResult> {
    const errorsByEventId: Record<string, string> = {};
    let pushedCount = 0;

    for (const evt of events) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = evt.payload ?? {};
        if (evt.type === "user_register" || evt.type === "user_update" || evt.type === "user_delete") {
          const user = payload.user as User | undefined;
          if (!user) throw new Error("Missing payload.user");
          await serverDb.users.put(user);
          await recordChange({ entityType: "user", entityId: user.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "school_upsert") {
          const school = payload.school as School | undefined;
          if (!school) throw new Error("Missing payload.school");
          await serverDb.schools.put(school);
          await recordChange({ entityType: "school", entityId: school.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "coupon_upsert") {
          const coupon = payload.coupon as Coupon | undefined;
          if (!coupon) throw new Error("Missing payload.coupon");
          await serverDb.coupons.put(coupon);
          await recordChange({ entityType: "coupon", entityId: coupon.code });
          pushedCount++;
          continue;
        }

        if (evt.type === "coupons_bulk_upsert") {
          const coupons = (payload.coupons as Coupon[] | undefined) ?? [];
          if (!coupons.length) throw new Error("Missing payload.coupons");
          await serverDb.coupons.bulkPut(coupons);
          for (const c of coupons) await recordChange({ entityType: "coupon", entityId: c.code });
          pushedCount++;
          continue;
        }

        if (evt.type === "license_grant_upsert") {
          const grant = payload.grant as LicenseGrant | undefined;
          if (!grant) throw new Error("Missing payload.grant");
          await serverDb.licenseGrants.put(grant);
          await recordChange({ entityType: "licenseGrant", entityId: grant.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "lesson_upsert") {
          const lesson = payload.lesson as Lesson | undefined;
          if (!lesson) throw new Error("Missing payload.lesson");
          await serverDb.lessons.put(lesson);
          await recordChange({ entityType: "lesson", entityId: lesson.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "lesson_upsert_full") {
          const lesson = payload.lesson as Lesson | undefined;
          const content = payload.content as { lessonId: string; blocks: unknown[] } | undefined;
          const quiz = payload.quiz as { id: string; lessonId: string } | undefined;
          const assets = (payload.assets as LessonAsset[] | undefined) ?? [];
          if (!lesson || !content) throw new Error("Missing lesson/content");
          await serverDb.lessons.put(lesson);
          await serverDb.lessonContents.put(content as any);
          if (quiz) await serverDb.quizzes.put(quiz as any);
          if (assets.length) await serverDb.lessonAssets.bulkPut(assets);
          await recordChange({ entityType: "lesson", entityId: lesson.id });
          await recordChange({ entityType: "lessonContent", entityId: lesson.id });
          if (quiz) await recordChange({ entityType: "quiz", entityId: (quiz as any).id });
          for (const a of assets) await recordChange({ entityType: "lessonAsset", entityId: a.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "settings_push") {
          const settings = (payload.settings as AppSetting[] | undefined) ?? [];
          const categories = (payload.curriculumCategories as CurriculumCategory[] | undefined) ?? [];
          const subjects = (payload.curriculumSubjects as CurriculumSubject[] | undefined) ?? [];
          if (settings.length) {
            await serverDb.settings.bulkPut(settings);
            for (const s of settings) await recordChange({ entityType: "setting", entityId: s.key });
          }
          if (categories.length) {
            await serverDb.curriculumCategories.bulkPut(categories);
            for (const c of categories) await recordChange({ entityType: "curriculumCategory", entityId: c.id });
          }
          if (subjects.length) {
            await serverDb.curriculumSubjects.bulkPut(subjects);
            for (const s of subjects) await recordChange({ entityType: "curriculumSubject", entityId: s.id });
          }
          pushedCount++;
          continue;
        }
        if (evt.type === "teacher_register") {
          const user = payload.user as User | undefined;
          if (!user) throw new Error("Missing payload.user");
          await serverDb.users.put(user);
          await recordChange({ entityType: "user", entityId: user.id });
          if (user.status === "pending") {
            await addNotification({
              userId: "user_admin",
              type: "system",
              title: "New teacher registration",
              body: `${user.displayName} (${user.username}) is awaiting approval.`,
              data: { teacherId: user.id }
            });
          }
          pushedCount++;
          continue;
        }

        if (evt.type === "teacher_approved" || evt.type === "teacher_suspended") {
          const userId = payload.userId as string | undefined;
          const status = payload.status as User["status"] | undefined;
          if (!userId || !status) throw new Error("Missing payload.userId/status");
          const user = await serverDb.users.get(userId);
          if (!user) throw new Error("User not found on server");
          await serverDb.users.put({ ...user, status });
          await recordChange({ entityType: "user", entityId: userId });
          await addNotification({
            userId,
            type: status === "active" ? "teacher_approved" : "teacher_suspended",
            title: status === "active" ? "Teacher approved" : "Teacher suspended",
            body: status === "active" ? "You can now upload lessons." : "Your account is suspended."
          });
          pushedCount++;
          continue;
        }

        if (evt.type === "lesson_submit") {
          const lesson = payload.lesson as Lesson | undefined;
          const content = payload.content as { lessonId: string; blocks: unknown[] } | undefined;
          const quiz = payload.quiz as { id: string; lessonId: string } | undefined;
          const assets = (payload.assets as LessonAsset[] | undefined) ?? [];
          if (!lesson || !content) throw new Error("Missing lesson/content");
          await serverDb.lessons.put({ ...lesson, status: "pending_approval" });
          await serverDb.lessonContents.put(content as any);
          if (quiz) await serverDb.quizzes.put(quiz as any);
          if (assets.length) await serverDb.lessonAssets.bulkPut(assets);
          await recordChange({ entityType: "lesson", entityId: lesson.id });
          await recordChange({ entityType: "lessonContent", entityId: lesson.id });
          if (quiz) await recordChange({ entityType: "quiz", entityId: (quiz as any).id });
          for (const a of assets) await recordChange({ entityType: "lessonAsset", entityId: a.id });
          await addNotification({
            userId: "user_admin",
            type: "system",
            title: "Lesson submitted for approval",
            body: `${lesson.title} is awaiting review.`,
            data: { lessonId: lesson.id }
          });
          pushedCount++;
          continue;
        }

        if (evt.type === "lesson_approved" || evt.type === "lesson_rejected") {
          const updatedLesson = payload.lesson as Lesson | undefined;
          if (!updatedLesson) throw new Error("Missing payload.lesson");
          await serverDb.lessons.put(updatedLesson);
          await recordChange({ entityType: "lesson", entityId: updatedLesson.id });
          const type = evt.type === "lesson_approved" ? "lesson_approved" : "lesson_rejected";
          await addNotification({
            userId: updatedLesson.createdByUserId,
            type,
            title: evt.type === "lesson_approved" ? "Lesson approved" : "Lesson rejected",
            body:
              evt.type === "lesson_approved"
                ? `${updatedLesson.title} is now published.`
                : `Feedback: ${updatedLesson.adminFeedback ?? "No details"}`,
            data: { lessonId: updatedLesson.id }
          });
          if (evt.type === "lesson_approved") {
            await addNotification({
              userId: "*",
              type: "new_lessons_available",
              title: "New lesson available",
              body: updatedLesson.title,
              data: { lessonId: updatedLesson.id }
            });
          }
          pushedCount++;
          continue;
        }

        if (evt.type === "payment_recorded") {
          const payment = payload.payment as Payment | undefined;
          const grant = payload.grant as LicenseGrant | undefined;
          if (!payment) throw new Error("Missing payload.payment");
          await serverDb.payments.put(payment);
          await recordChange({ entityType: "payment", entityId: payment.id });
          if (grant) {
            await serverDb.licenseGrants.put(grant);
            await recordChange({ entityType: "licenseGrant", entityId: grant.id });
          }
          if (payment.status === "pending") {
            await addNotification({
              userId: "user_admin",
              type: "system",
              title: "Payment pending verification",
              body: `${payment.studentId} submitted ${payment.reference}`,
              data: { paymentId: payment.id }
            });
          }
          pushedCount++;
          continue;
        }

        if (evt.type === "payment_verified" || evt.type === "payment_rejected") {
          const payment = payload.payment as Payment | undefined;
          const grant = payload.grant as LicenseGrant | undefined;
          if (!payment) throw new Error("Missing payload.payment");
          await serverDb.payments.put(payment);
          await recordChange({ entityType: "payment", entityId: payment.id });
          if (grant) {
            await serverDb.licenseGrants.put(grant);
            await recordChange({ entityType: "licenseGrant", entityId: grant.id });
          }
          await addNotification({
            userId: payment.studentId,
            type: payment.status === "verified" ? "payment_verified" : "payment_rejected",
            title: payment.status === "verified" ? "Payment verified" : "Payment rejected",
            body: payment.status === "verified" ? "Access unlocked." : "Please contact support."
          });
          pushedCount++;
          continue;
        }

        if (evt.type === "coupon_redeemed") {
          // Optional for MVP; payment_recorded carries the real grant.
          pushedCount++;
          continue;
        }

        if (evt.type === "message_send") {
          const message = payload.message as Message | undefined;
          if (!message) throw new Error("Missing payload.message");
          await serverDb.messages.put({ ...message, status: "sent" });
          await recordChange({ entityType: "message", entityId: message.id });
          pushedCount++;
          continue;
        }

        if (evt.type === "progress_updated") {
          // Best-effort; payload may include progress/attempts.
          const progress = payload.progress as any;
          if (progress?.id) {
            await serverDb.progress.put(progress);
            await recordChange({ entityType: "progress", entityId: progress.id });
          }
          const attempt = payload.quizAttempt as any;
          if (attempt?.id) {
            await serverDb.quizAttempts.put(attempt);
            await recordChange({ entityType: "quizAttempt", entityId: attempt.id });
          }
          pushedCount++;
          continue;
        }

        pushedCount++;
      } catch (err) {
        errorsByEventId[evt.id] = err instanceof Error ? err.message : "Unknown error";
      }
    }

    const ok = Object.keys(errorsByEventId).length === 0;
    return ok ? { ok: true, pushedCount } : { ok: false, pushedCount, errorsByEventId };
  }

  async pullChanges(since?: string): Promise<PullBundle> {
    const sinceIso = since ?? "";
    const changes = since ? await serverDb.changes.where("createdAt").aboveOrEqual(sinceIso).toArray() : null;
    const lastChange = await serverDb.changes.orderBy("createdAt").last();
    const serverTime =
      changes && changes.length > 0
        ? changes.reduce((max, c) => (c.createdAt.localeCompare(max) > 0 ? c.createdAt : max), sinceIso)
        : lastChange?.createdAt ?? nowIso();

    const wantAll = !since;
    const changedTypes = new Set<string>();
    if (!wantAll && changes) for (const c of changes) changedTypes.add(c.entityType);

    async function maybe<T>(type: string, fn: () => Promise<T[]>) {
      if (wantAll) return fn();
      return changedTypes.has(type) ? fn() : undefined;
    }

    const notifications = await maybe("notification", async () => {
      const all = await serverDb.notifications.toArray();
      return all;
    });

    return {
      serverTime,
      users: await maybe("user", () => serverDb.users.toArray()),
      schools: await maybe("school", () => serverDb.schools.toArray()),
      settings: await maybe("setting", () => serverDb.settings.toArray()),
      curriculumCategories: await maybe("curriculumCategory", () => serverDb.curriculumCategories.toArray()),
      curriculumSubjects: await maybe("curriculumSubject", () => serverDb.curriculumSubjects.toArray()),
      lessons: await maybe("lesson", () => serverDb.lessons.toArray()),
      lessonContents: await maybe("lessonContent", () => serverDb.lessonContents.toArray()),
      lessonAssets: await maybe("lessonAsset", () => serverDb.lessonAssets.toArray()),
      quizzes: await maybe("quiz", () => serverDb.quizzes.toArray()),
      progress: await maybe("progress", () => serverDb.progress.toArray()),
      quizAttempts: await maybe("quizAttempt", () => serverDb.quizAttempts.toArray()),
      payments: await maybe("payment", () => serverDb.payments.toArray()),
      licenseGrants: await maybe("licenseGrant", () => serverDb.licenseGrants.toArray()),
      coupons: await maybe("coupon", () => serverDb.coupons.toArray()),
      messages: await maybe("message", () => serverDb.messages.toArray()),
      notifications,
      auditLogs: await maybe("auditLog", () => serverDb.auditLogs.toArray())
    };
  }
}
