import type { SyncAdapter, PullBundle } from "@/shared/sync/SyncAdapter";
import { db } from "@/shared/db/db";
import { getDeviceId } from "@/shared/device";
import { getServerId } from "@/shared/server";
import type {
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
  User
} from "@/shared/types";
import type { AppSetting, Coupon, CurriculumCategory, CurriculumClass, CurriculumLevel, CurriculumSubject, School } from "@/shared/types";

function getLastSyncKey() {
  const device = getDeviceId();
  const server = getServerId();
  const suffix = server ? `.server.${server}` : "";
  return device ? `somasmart.sync.${device}${suffix}.lastSyncAt` : `somasmart.sync${suffix}.lastSyncAt`;
}

function nowIso() {
  return new Date().toISOString();
}

function getLastSyncAt() {
  return localStorage.getItem(getLastSyncKey()) ?? undefined;
}

function setLastSyncAt(value: string) {
  localStorage.setItem(getLastSyncKey(), value);
}

async function hydrateEvent(evt: OutboxEvent): Promise<OutboxEvent> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = evt.payload ?? {};

  if (evt.type === "user_register" || evt.type === "user_update" || evt.type === "user_delete") {
    const userId = payload.userId as string | undefined;
    if (!userId) return evt;
    const user = await db.users.get(userId);
    if (!user) return evt;
    return { ...evt, payload: { user } };
  }

  if (evt.type === "teacher_register") {
    const userId = payload.userId as string | undefined;
    if (!userId) return evt;
    const user = await db.users.get(userId);
    if (!user) return evt;
    return { ...evt, payload: { user } };
  }

  if (evt.type === "lesson_submit") {
    const lessonId = payload.lessonId as string | undefined;
    if (!lessonId) return evt;
    const lesson = await db.lessons.get(lessonId);
    const content = await db.lessonContents.get(lessonId);
    const assets = await db.lessonAssets.where("lessonId").equals(lessonId).toArray();
    const quiz = (await db.quizzes.where("lessonId").equals(lessonId).first()) ?? null;
    if (!lesson || !content) return evt;
    return { ...evt, payload: { lesson, content, assets, quiz: quiz ?? undefined } };
  }

  if (evt.type === "lesson_upsert") {
    const lessonId = payload.lessonId as string | undefined;
    if (!lessonId) return evt;
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return evt;
    return { ...evt, payload: { lesson } };
  }

  if (evt.type === "lesson_upsert_full") {
    const lessonId = payload.lessonId as string | undefined;
    if (!lessonId) return evt;
    const lesson = await db.lessons.get(lessonId);
    const content = await db.lessonContents.get(lessonId);
    const assets = await db.lessonAssets.where("lessonId").equals(lessonId).toArray();
    const quiz = (await db.quizzes.where("lessonId").equals(lessonId).first()) ?? null;
    if (!lesson || !content) return evt;
    return { ...evt, payload: { lesson, content, assets, quiz: quiz ?? undefined } };
  }

  if (evt.type === "school_upsert") {
    const schoolId = payload.schoolId as string | undefined;
    if (!schoolId) return evt;
    const school = await db.schools.get(schoolId);
    if (!school) return evt;
    return { ...evt, payload: { school } };
  }

  if (evt.type === "coupon_upsert") {
    const code = payload.code as string | undefined;
    if (!code) return evt;
    const coupon = await db.coupons.get(code);
    if (!coupon) return evt;
    return { ...evt, payload: { coupon } };
  }

  if (evt.type === "coupons_bulk_upsert") {
    const codes = (payload.codes as string[] | undefined) ?? [];
    if (!codes.length) return evt;
    const coupons = (await db.coupons.bulkGet(codes)).filter(Boolean);
    return { ...evt, payload: { coupons } };
  }

  if (evt.type === "license_grant_upsert") {
    const grantId = payload.grantId as string | undefined;
    if (!grantId) return evt;
    const grant = await db.licenseGrants.get(grantId);
    if (!grant) return evt;
    return { ...evt, payload: { grant } };
  }

  if (evt.type === "settings_push") {
    const settings = await db.settings.toArray();
    const curriculumCategories = await db.curriculumCategories.toArray();
    const curriculumLevels = await db.curriculumLevels.toArray();
    const curriculumClasses = await db.curriculumClasses.toArray();
    const curriculumSubjects = await db.curriculumSubjects.toArray();
    return { ...evt, payload: { settings, curriculumCategories, curriculumLevels, curriculumClasses, curriculumSubjects } };
  }

  if (evt.type === "lesson_approved" || evt.type === "lesson_rejected") {
    const lessonId = payload.lessonId as string | undefined;
    if (!lessonId) return evt;
    const lesson = await db.lessons.get(lessonId);
    if (!lesson) return evt;
    return { ...evt, payload: { lesson } };
  }

  if (evt.type === "payment_recorded") {
    const paymentId = payload.paymentId as string | undefined;
    if (!paymentId) return evt;
    const payment = await db.payments.get(paymentId);
    if (!payment) return evt;
    const grant =
      (await db.licenseGrants.where("sourcePaymentId").equals(paymentId).first()) ?? undefined;
    return { ...evt, payload: { payment, grant } };
  }

  if (evt.type === "payment_verified") {
    const paymentId = payload.paymentId as string | undefined;
    if (!paymentId) return evt;
    const payment = await db.payments.get(paymentId);
    if (!payment) return evt;
    const grantId = payload.grantId as string | undefined;
    const grant =
      (grantId ? await db.licenseGrants.get(grantId) : null) ??
      (await db.licenseGrants.where("sourcePaymentId").equals(paymentId).first()) ??
      undefined;
    return { ...evt, payload: { payment, grant } };
  }

  if (evt.type === "payment_rejected") {
    const paymentId = payload.paymentId as string | undefined;
    if (!paymentId) return evt;
    const payment = await db.payments.get(paymentId);
    if (!payment) return evt;
    return { ...evt, payload: { payment } };
  }

  if (evt.type === "message_send") {
    const messageId = payload.messageId as string | undefined;
    if (!messageId) return evt;
    const message = await db.messages.get(messageId);
    if (!message) return evt;
    return { ...evt, payload: { message } };
  }

  return evt;
}

async function applyUsers(users: User[]) {
  for (const u of users) {
    const existing = await db.users.get(u.id);
    if (!existing) {
      await db.users.put(u);
      continue;
    }
    // Preserve local password hash; server is not responsible for auth in MVP.
    await db.users.put({ ...existing, ...u, passwordHash: existing.passwordHash });
  }
}

async function applyLessons(lessons: Lesson[]) {
  for (const l of lessons) {
    const existing = await db.lessons.get(l.id);
    if (!existing) {
      await db.lessons.put(l);
      continue;
    }
    if (l.updatedAt.localeCompare(existing.updatedAt) > 0) {
      await db.lessons.put(l);
    }
  }
}

async function applyPayments(payments: Payment[]) {
  for (const p of payments) {
    const existing = await db.payments.get(p.id);
    if (!existing) {
      await db.payments.put(p);
      continue;
    }
    if (existing.status !== p.status) await db.payments.put({ ...existing, ...p });
  }
}

async function applyNotifications(notifs: Notification[], currentUserId?: string | null) {
  for (const n of notifs) {
    const targetUserId = n.userId === "*" ? currentUserId : n.userId;
    if (!targetUserId) continue;
    const existing = await db.notifications.get(n.id);
    if (existing) continue;
    await db.notifications.put({ ...n, userId: targetUserId });
  }
}

export async function syncNow({
  adapter,
  currentUserId
}: {
  adapter: SyncAdapter;
  currentUserId?: string | null;
}) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("You are offline. Connect to the internet to sync.");
  }
  const pending = await db.outboxEvents
    .where("syncStatus")
    .anyOf(["queued", "failed"] as const)
    .sortBy("createdAt");

  const hydrated: OutboxEvent[] = [];
  for (const evt of pending) hydrated.push(await hydrateEvent(evt));

  const pushRes = await adapter.pushEvents(hydrated);
  if (pushRes.errorsByEventId) {
    for (const evt of pending) {
      const err = pushRes.errorsByEventId[evt.id];
      if (err) {
        await db.outboxEvents.update(evt.id, { syncStatus: "failed", lastError: err });
      } else {
        await db.outboxEvents.update(evt.id, { syncStatus: "synced", lastError: undefined });
      }
    }
  } else {
    for (const evt of pending) {
      await db.outboxEvents.update(evt.id, { syncStatus: "synced", lastError: undefined });
    }
  }

  const since = getLastSyncAt();
  const bundle = await adapter.pullChanges(since);
  await applyPullBundle(bundle, currentUserId);
  setLastSyncAt(bundle.serverTime);

  return {
    pushed: pushRes.pushedCount,
    pulledAt: bundle.serverTime,
    ok: pushRes.ok
  };
}

export async function applyPullBundle(bundle: PullBundle, currentUserId?: string | null) {
  await db.transaction(
    "rw",
    [
      db.users,
      db.schools,
      db.settings,
      db.curriculumCategories,
      db.curriculumLevels,
      db.curriculumClasses,
      db.curriculumSubjects,
      db.lessons,
      db.lessonContents,
      db.lessonAssets,
      db.quizzes,
      db.progress,
      db.quizAttempts,
      db.payments,
      db.licenseGrants,
      db.coupons,
      db.messages,
      db.notifications,
      db.auditLogs
    ],
    async () => {
      if (bundle.users) await applyUsers(bundle.users);
      if (bundle.schools) await db.schools.bulkPut(bundle.schools as School[]);
      if (bundle.settings) await db.settings.bulkPut(bundle.settings as AppSetting[]);
      if (bundle.curriculumCategories) await db.curriculumCategories.bulkPut(bundle.curriculumCategories as CurriculumCategory[]);
      if (bundle.curriculumLevels) await db.curriculumLevels.bulkPut(bundle.curriculumLevels as CurriculumLevel[]);
      if (bundle.curriculumClasses) await db.curriculumClasses.bulkPut(bundle.curriculumClasses as CurriculumClass[]);
      if (bundle.curriculumSubjects) await db.curriculumSubjects.bulkPut(bundle.curriculumSubjects as CurriculumSubject[]);
      if (bundle.lessons) await applyLessons(bundle.lessons);
      if (bundle.lessonContents) await db.lessonContents.bulkPut(bundle.lessonContents);
      if (bundle.lessonAssets) await db.lessonAssets.bulkPut(bundle.lessonAssets as LessonAsset[]);
      if (bundle.quizzes) await db.quizzes.bulkPut(bundle.quizzes as Quiz[]);
      if (bundle.progress) await db.progress.bulkPut(bundle.progress as Progress[]);
      if (bundle.quizAttempts) await db.quizAttempts.bulkPut(bundle.quizAttempts as QuizAttempt[]);
      if (bundle.payments) await applyPayments(bundle.payments as Payment[]);
      if (bundle.licenseGrants) await db.licenseGrants.bulkPut(bundle.licenseGrants as LicenseGrant[]);
      if (bundle.coupons) await db.coupons.bulkPut(bundle.coupons as Coupon[]);
      if (bundle.messages) {
        for (const m of bundle.messages as Message[]) {
          const existing = await db.messages.get(m.id);
          if (!existing) await db.messages.put(m);
          else if (existing.status !== m.status) await db.messages.put({ ...existing, ...m });
        }
      }
      if (bundle.notifications) await applyNotifications(bundle.notifications, currentUserId);
      if (bundle.auditLogs) await db.auditLogs.bulkPut(bundle.auditLogs);
    }
  );
}

export function getSyncMeta() {
  return { lastSyncAt: getLastSyncAt() ?? null, now: nowIso() };
}
