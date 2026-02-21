import type { LessonContent } from "@/shared/db/db";
import type { PullBundle, PushResult, SyncAdapter } from "@/shared/sync/SyncAdapter";
import { clearSyncApiSession, ensureSyncAccessToken } from "@/shared/sync/api/syncApiSession";
import { getSyncApiBaseUrl, getSyncDeviceId, getSyncProjectKey } from "@/shared/sync/config";
import type {
  AppSetting,
  AuditLog,
  Coupon,
  CurriculumCategory,
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  Lesson,
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

type SyncPushEvent = {
  eventId: string;
  entityType: string;
  entityId: string;
  op: "upsert" | "delete";
  data?: Record<string, unknown>;
  occurredAt: string;
};

type PushResponse = {
  replayed: boolean;
  accepted: string[];
  rejected: Array<{ eventId: string; code: string; message: string }>;
  serverWatermark: number;
};

type PullResponse = {
  scope: string;
  changes: Array<{
    id: string;
    seq: number;
    entityType: string;
    entityId: string;
    op: "upsert" | "delete";
    data?: Record<string, unknown>;
    occurredAt: string;
  }>;
  nextCheckpoints: Record<string, number>;
};

const DEFAULT_SCOPE = "default";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseSinceCursor(since?: string) {
  if (!since) return 0;
  const parsed = Number.parseInt(since, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const code = "code" in payload && typeof payload.code === "string" ? payload.code : null;
  const message = "message" in payload && typeof payload.message === "string" ? payload.message : null;
  if (code && message) return `${code}: ${message}`;
  if (code) return code;
  if (message) return message;
  return fallback;
}

function buildSyncEvent(
  outboxEvent: OutboxEvent,
  suffix: string,
  entityType: string,
  entityId: string,
  data?: Record<string, unknown>
): SyncPushEvent {
  const baseId = `${outboxEvent.id}_${suffix}`.slice(0, 120);
  return {
    eventId: baseId,
    entityType,
    entityId,
    op: "upsert",
    data,
    occurredAt: outboxEvent.createdAt
  };
}

function toSyncEvents(outboxEvent: OutboxEvent): SyncPushEvent[] {
  const payload = asRecord(outboxEvent.payload) ?? {};
  const events: SyncPushEvent[] = [];

  const user = asRecord(payload.user);
  if (outboxEvent.type === "user_register" || outboxEvent.type === "user_update" || outboxEvent.type === "user_delete") {
    if (user && typeof user.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "user", "users", user.id, user));
    } else if (outboxEvent.type === "user_delete" && typeof payload.userId === "string") {
      events.push(
        buildSyncEvent(outboxEvent, "user_delete", "users", payload.userId, {
          id: payload.userId,
          deletedAt: outboxEvent.createdAt
        })
      );
    }
    return events;
  }

  if (outboxEvent.type === "teacher_register") {
    if (user && typeof user.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "teacher", "users", user.id, user));
    }
    return events;
  }

  if (outboxEvent.type === "teacher_approved" || outboxEvent.type === "teacher_suspended") {
    // `user_update` already carries a full user payload. Skip these status-notify
    // events for backend sync to avoid partial user writes.
    return events;
  }

  const school = asRecord(payload.school);
  if (outboxEvent.type === "school_upsert") {
    if (school && typeof school.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "school", "schools", school.id, school));
    }
    return events;
  }

  const coupon = asRecord(payload.coupon);
  if (outboxEvent.type === "coupon_upsert") {
    if (coupon && typeof coupon.code === "string") {
      events.push(buildSyncEvent(outboxEvent, "coupon", "coupons", coupon.code, coupon));
    }
    return events;
  }

  if (outboxEvent.type === "coupons_bulk_upsert") {
    const coupons = Array.isArray(payload.coupons) ? payload.coupons : [];
    coupons.forEach((entry, index) => {
      const c = asRecord(entry);
      if (!c || typeof c.code !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `coupon_${index}`, "coupons", c.code, c));
    });
    return events;
  }

  const grant = asRecord(payload.grant);
  if (outboxEvent.type === "license_grant_upsert") {
    if (grant && typeof grant.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "grant", "licenseGrants", grant.id, grant));
    }
    return events;
  }

  const lesson = asRecord(payload.lesson);
  const content = asRecord(payload.content);
  const quiz = asRecord(payload.quiz);
  if (outboxEvent.type === "lesson_upsert") {
    if (lesson && typeof lesson.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "lesson", "lessons", lesson.id, lesson));
    }
    return events;
  }

  if (outboxEvent.type === "lesson_upsert_full" || outboxEvent.type === "lesson_submit") {
    if (lesson && typeof lesson.id === "string") {
      const lessonRow = { ...lesson };
      if (outboxEvent.type === "lesson_submit") lessonRow.status = "pending_approval";
      events.push(buildSyncEvent(outboxEvent, "lesson", "lessons", lesson.id, lessonRow));
    }
    if (content && typeof content.lessonId === "string") {
      events.push(buildSyncEvent(outboxEvent, "content", "lessonContents", content.lessonId, content));
    }
    if (quiz && typeof quiz.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "quiz", "quizzes", quiz.id, quiz));
    }
    // Lesson assets are blob-backed and are not posted over /sync/push JSON.
    return events;
  }

  if (outboxEvent.type === "settings_push") {
    const settings = Array.isArray(payload.settings) ? payload.settings : [];
    const categories = Array.isArray(payload.curriculumCategories) ? payload.curriculumCategories : [];
    const levels = Array.isArray(payload.curriculumLevels) ? payload.curriculumLevels : [];
    const classes = Array.isArray(payload.curriculumClasses) ? payload.curriculumClasses : [];
    const subjects = Array.isArray(payload.curriculumSubjects) ? payload.curriculumSubjects : [];

    settings.forEach((entry, index) => {
      const row = asRecord(entry);
      if (!row || typeof row.key !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `setting_${index}`, "settings", row.key, row));
    });
    categories.forEach((entry, index) => {
      const row = asRecord(entry);
      if (!row || typeof row.id !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `category_${index}`, "curriculumCategories", row.id, row));
    });
    levels.forEach((entry, index) => {
      const row = asRecord(entry);
      if (!row || typeof row.id !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `level_${index}`, "curriculumLevels", row.id, row));
    });
    classes.forEach((entry, index) => {
      const row = asRecord(entry);
      if (!row || typeof row.id !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `class_${index}`, "curriculumClasses", row.id, row));
    });
    subjects.forEach((entry, index) => {
      const row = asRecord(entry);
      if (!row || typeof row.id !== "string") return;
      events.push(buildSyncEvent(outboxEvent, `subject_${index}`, "curriculumSubjects", row.id, row));
    });
    return events;
  }

  if (outboxEvent.type === "lesson_approved" || outboxEvent.type === "lesson_rejected") {
    if (lesson && typeof lesson.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "lesson", "lessons", lesson.id, lesson));
    }
    return events;
  }

  const payment = asRecord(payload.payment);
  if (outboxEvent.type === "payment_recorded" || outboxEvent.type === "payment_verified" || outboxEvent.type === "payment_rejected") {
    if (payment && typeof payment.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "payment", "payments", payment.id, payment));
    }
    if (grant && typeof grant.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "grant", "licenseGrants", grant.id, grant));
    }
    return events;
  }

  if (outboxEvent.type === "coupon_redeemed") {
    return events;
  }

  const message = asRecord(payload.message);
  if (outboxEvent.type === "message_send") {
    if (message && typeof message.id === "string") {
      const withSentStatus = { ...message, status: "sent" };
      events.push(buildSyncEvent(outboxEvent, "message", "messages", message.id, withSentStatus));
    }
    return events;
  }

  if (outboxEvent.type === "progress_updated") {
    const progress = asRecord(payload.progress);
    const attempt = asRecord(payload.quizAttempt);
    if (progress && typeof progress.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "progress", "progress", progress.id, progress));
    }
    if (attempt && typeof attempt.id === "string") {
      events.push(buildSyncEvent(outboxEvent, "attempt", "quizAttempts", attempt.id, attempt));
    }
    return events;
  }

  return events;
}

async function requestJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const doRequest = async (forceFreshToken = false) => {
    const token = await ensureSyncAccessToken({ forceFresh: forceFreshToken });
    const response = await fetch(`${getSyncApiBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    return response;
  };

  let response = await doRequest(false);
  if (response.status === 401) {
    clearSyncApiSession();
    response = await doRequest(true);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `${response.status} ${response.statusText}`));
  }

  return payload as T;
}

function putTypedFromChange<T>(
  map: Map<string, T>,
  key: string,
  change: PullResponse["changes"][number]
) {
  if (change.op === "delete") return;
  const row = asRecord(change.data);
  if (!row) return;
  map.set(key, row as T);
}

export class ApiSyncAdapter implements SyncAdapter {
  async pushEvents(events: OutboxEvent[]): Promise<PushResult> {
    if (!events.length) {
      return { ok: true, pushedCount: 0 };
    }

    const syncEvents: SyncPushEvent[] = [];
    const syncEventIdToOutboxId = new Map<string, string>();
    for (const outboxEvent of events) {
      const mapped = toSyncEvents(outboxEvent);
      for (const syncEvent of mapped) {
        syncEvents.push(syncEvent);
        syncEventIdToOutboxId.set(syncEvent.eventId, outboxEvent.id);
      }
    }

    // Some local-only events intentionally do not map to backend sync entities.
    if (!syncEvents.length) {
      return { ok: true, pushedCount: events.length };
    }

    const payload = {
      projectKey: getSyncProjectKey(),
      deviceId: getSyncDeviceId(),
      batchId: `batch_${Date.now()}`,
      events: syncEvents
    };
    const result = await requestJson<PushResponse>("/sync/push", payload);
    const errorsByEventId: Record<string, string> = {};

    for (const item of result.rejected) {
      const outboxId = syncEventIdToOutboxId.get(item.eventId) ?? item.eventId;
      if (!errorsByEventId[outboxId]) {
        errorsByEventId[outboxId] = `${item.code}: ${item.message}`;
      }
    }

    const failedOutboxIds = new Set(Object.keys(errorsByEventId));
    const pushedCount = events.filter((evt) => !failedOutboxIds.has(evt.id)).length;
    return {
      ok: failedOutboxIds.size === 0,
      pushedCount,
      errorsByEventId: failedOutboxIds.size ? errorsByEventId : undefined
    };
  }

  async pullChanges(since?: string): Promise<PullBundle> {
    const sinceCursor = parseSinceCursor(since);
    const payload = {
      projectKey: getSyncProjectKey(),
      deviceId: getSyncDeviceId(),
      checkpoints: {
        [DEFAULT_SCOPE]: sinceCursor
      }
    };

    const result = await requestJson<PullResponse>("/sync/pull", payload);
    const users = new Map<string, User>();
    const schools = new Map<string, School>();
    const settings = new Map<string, AppSetting>();
    const curriculumCategories = new Map<string, CurriculumCategory>();
    const curriculumLevels = new Map<string, CurriculumLevel>();
    const curriculumClasses = new Map<string, CurriculumClass>();
    const curriculumSubjects = new Map<string, CurriculumSubject>();
    const lessons = new Map<string, Lesson>();
    const lessonContents = new Map<string, LessonContent>();
    const quizzes = new Map<string, Quiz>();
    const progress = new Map<string, Progress>();
    const quizAttempts = new Map<string, QuizAttempt>();
    const payments = new Map<string, Payment>();
    const licenseGrants = new Map<string, LicenseGrant>();
    const coupons = new Map<string, Coupon>();
    const messages = new Map<string, Message>();
    const notifications = new Map<string, Notification>();
    const auditLogs = new Map<string, AuditLog>();

    for (const change of result.changes) {
      switch (change.entityType) {
        case "users":
          putTypedFromChange(users, change.entityId, change);
          break;
        case "schools":
          putTypedFromChange(schools, change.entityId, change);
          break;
        case "settings":
          putTypedFromChange(settings, change.entityId, change);
          break;
        case "curriculumCategories":
          putTypedFromChange(curriculumCategories, change.entityId, change);
          break;
        case "curriculumLevels":
          putTypedFromChange(curriculumLevels, change.entityId, change);
          break;
        case "curriculumClasses":
          putTypedFromChange(curriculumClasses, change.entityId, change);
          break;
        case "curriculumSubjects":
          putTypedFromChange(curriculumSubjects, change.entityId, change);
          break;
        case "lessons":
          putTypedFromChange(lessons, change.entityId, change);
          break;
        case "lessonContents":
          putTypedFromChange(lessonContents, change.entityId, change);
          break;
        case "quizzes":
          putTypedFromChange(quizzes, change.entityId, change);
          break;
        case "progress":
          putTypedFromChange(progress, change.entityId, change);
          break;
        case "quizAttempts":
          putTypedFromChange(quizAttempts, change.entityId, change);
          break;
        case "payments":
          putTypedFromChange(payments, change.entityId, change);
          break;
        case "licenseGrants":
          putTypedFromChange(licenseGrants, change.entityId, change);
          break;
        case "coupons":
          putTypedFromChange(coupons, change.entityId, change);
          break;
        case "messages":
          putTypedFromChange(messages, change.entityId, change);
          break;
        case "notifications":
          putTypedFromChange(notifications, change.entityId, change);
          break;
        case "auditLogs":
          putTypedFromChange(auditLogs, change.entityId, change);
          break;
        default:
          break;
      }
    }

    const next = result.nextCheckpoints?.[DEFAULT_SCOPE];
    return {
      serverTime: Number.isFinite(next) ? String(next) : String(sinceCursor),
      users: users.size ? [...users.values()] : undefined,
      schools: schools.size ? [...schools.values()] : undefined,
      settings: settings.size ? [...settings.values()] : undefined,
      curriculumCategories: curriculumCategories.size ? [...curriculumCategories.values()] : undefined,
      curriculumLevels: curriculumLevels.size ? [...curriculumLevels.values()] : undefined,
      curriculumClasses: curriculumClasses.size ? [...curriculumClasses.values()] : undefined,
      curriculumSubjects: curriculumSubjects.size ? [...curriculumSubjects.values()] : undefined,
      lessons: lessons.size ? [...lessons.values()] : undefined,
      lessonContents: lessonContents.size ? [...lessonContents.values()] : undefined,
      quizzes: quizzes.size ? [...quizzes.values()] : undefined,
      progress: progress.size ? [...progress.values()] : undefined,
      quizAttempts: quizAttempts.size ? [...quizAttempts.values()] : undefined,
      payments: payments.size ? [...payments.values()] : undefined,
      licenseGrants: licenseGrants.size ? [...licenseGrants.values()] : undefined,
      coupons: coupons.size ? [...coupons.values()] : undefined,
      messages: messages.size ? [...messages.values()] : undefined,
      notifications: notifications.size ? [...notifications.values()] : undefined,
      auditLogs: auditLogs.size ? [...auditLogs.values()] : undefined
    };
  }
}

