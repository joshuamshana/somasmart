export type Role = "student" | "teacher" | "admin" | "school_admin";
export type UserStatus = "active" | "pending" | "suspended";
// Levels are admin-defined. We keep this as a string type for flexibility and offline governance.
export type Level = string;

export type User = {
  id: string;
  role: Role;
  status: UserStatus;
  displayName: string;
  username: string;
  passwordHash: string;
  schoolId?: string;
  isMinor?: boolean;
  deletedAt?: string;
  createdAt: string;
};

export type School = {
  id: string;
  name: string;
  code: string;
  messagingEnabledForMinors?: boolean;
  deletedAt?: string;
  createdAt: string;
};

export type LessonStatus = "draft" | "pending_approval" | "approved" | "rejected" | "unpublished";

export type AccessPolicy = "free" | "coupon";

export type Lesson = {
  id: string;
  title: string;
  schoolId?: string;
  subject: string;
  className?: string;
  curriculumLevelId?: string;
  curriculumClassId?: string;
  curriculumSubjectId?: string;
  level: Level;
  language: "en" | "sw" | string;
  tags: string[];
  // Optional override for access rules. If omitted, access is derived from subject defaults or legacy tags.
  accessPolicy?: AccessPolicy;
  description: string;
  status: LessonStatus;
  createdByUserId: string;
  adminFeedback?: string;
  expiresAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type LessonBlock =
  | { id: string; type: "text"; variant: "title" | "subtitle" | "heading" | "body"; text: string }
  | { id: string; type: "image"; assetId: string; mime: string; name: string }
  | { id: string; type: "audio"; assetId: string; mime: string; name: string }
  | { id: string; type: "video"; assetId: string; mime: string; name: string }
  | { id: string; type: "pdf"; assetId: string; mime: string; name: string }
  | { id: string; type: "pptx"; assetId: string; mime: string; name: string }
  | { id: string; type: "step_break"; title?: string }
  | { id: string; type: "quiz"; quizId: string; title?: string; requiredToContinue: true; passScorePct?: number };

export type LessonComponent =
  | { id: string; type: "text"; variant: "title" | "subtitle" | "heading" | "body"; text: string }
  | {
      id: string;
      type: "media";
      mediaType: "image" | "audio" | "video" | "pdf" | "pptx";
      assetId: string;
      name: string;
      mime: string;
    };

export type LessonBlockV2 = {
  id: string;
  title?: string;
  isDivider?: boolean;
  components: LessonComponent[];
  quizGate?: { quizId: string; requiredToContinue: true; passScorePct: number };
};

export type LessonContentV2 = {
  lessonId: string;
  version: 2;
  blocksV2: LessonBlockV2[];
};

export type LessonAsset = {
  id: string;
  lessonId: string;
  kind: "image" | "audio" | "video" | "pdf" | "pptx";
  name: string;
  mime: string;
  blob: Blob;
  pageCount?: number;
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  conceptTags: string[];
  nextSteps: { type: "repeat_lesson" | "retry_quiz" | "lesson"; lessonId?: string }[];
};

export type Quiz = {
  id: string;
  lessonId: string;
  questions: QuizQuestion[];
};

export type QuizAttempt = {
  id: string;
  studentId: string;
  quizId: string;
  score: number;
  answersByQuestionId: Record<string, number>;
  createdAt: string;
};

export type Progress = {
  id: string;
  studentId: string;
  lessonId: string;
  completedAt?: string;
  timeSpentSec: number;
  lastSeenAt: string;
};

export type LessonStepProgress = {
  id: string;
  studentId: string;
  lessonId: string;
  stepKey: string;
  completedAt: string;
  quizAttemptId?: string;
  bestScore?: number;
};

export type PaymentMethod = "mobile_money" | "coupon" | "voucher" | "sponsored";

export type PaymentStatus = "pending" | "verified" | "rejected";

export type Payment = {
  id: string;
  studentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
};

export type LicenseScope =
  | { type: "full" }
  | { type: "level"; level: Level }
  | { type: "subject"; subject: string }
  | { type: "curriculum_subject"; curriculumSubjectId: string };

export type LicenseGrant = {
  id: string;
  studentId: string;
  scope: LicenseScope;
  validUntil?: string;
  sourcePaymentId?: string;
  deletedAt?: string;
  createdAt: string;
};

export type Coupon = {
  code: string;
  scope: LicenseScope;
  validFrom: string;
  validUntil: string;
  maxRedemptions: number;
  redeemedByStudentIds: string[];
  active: boolean;
  batchId?: string;
  notes?: string;
  deletedAt?: string;
};

export type CurriculumCategory = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CurriculumLevel = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CurriculumClass = {
  id: string;
  levelId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type CurriculumSubject = {
  id: string;
  classId: string;
  name: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type MessageStatus = "queued" | "sent" | "read";
export type SupportStatus = "open" | "resolved";

export type Message = {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  createdAt: string;
  status: MessageStatus;
  supportStatus?: SupportStatus;
  assignedAdminUserId?: string;
};

export type NotificationType =
  | "teacher_approved"
  | "teacher_suspended"
  | "lesson_approved"
  | "lesson_rejected"
  | "payment_verified"
  | "payment_rejected"
  | "new_lessons_available"
  | "system";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  createdAt: string;
  readAt?: string;
  data?: Record<string, unknown>;
};

export type BadgeId =
  | "first_lesson_complete"
  | "first_quiz_submit"
  | "streak_3_days"
  | "streak_7_days";

export type Badge = {
  id: string;
  studentId: string;
  badgeId: BadgeId;
  earnedAt: string;
};

export type Streak = {
  studentId: string;
  currentStreakDays: number;
  lastActiveDate: string; // YYYY-MM-DD (local)
  updatedAt: string;
};

export type AuditAction =
  | "user_update"
  | "user_password_reset"
  | "teacher_create"
  | "teacher_approve"
  | "teacher_suspend"
  | "teacher_activate"
  | "teacher_delete"
  | "teacher_update"
  | "student_create"
  | "student_suspend"
  | "student_activate"
  | "student_delete"
  | "student_update"
  | "school_admin_suspend"
  | "school_admin_activate"
  | "school_admin_delete"
  | "school_admin_update"
  | "admin_create"
  | "admin_suspend"
  | "admin_activate"
  | "admin_delete"
  | "admin_update"
  | "lesson_approve"
  | "lesson_reject"
  | "lesson_update"
  | "lesson_unpublish"
  | "lesson_delete"
  | "payment_verify"
  | "payment_reject"
  | "license_grant_extend"
  | "license_grant_revoke"
  | "school_create"
  | "school_update"
  | "school_delete"
  | "school_regenerate_code"
  | "school_toggle_minors_messaging"
  | "school_admin_create"
  | "user_move_school"
  | "settings_reset"
  | "settings_update"
  | "backup_export"
  | "backup_import"
  | "curriculum_update"
  | "curriculum_delete"
  | "support_assign"
  | "support_resolve";

export type AuditLog = {
  id: string;
  actorUserId: string;
  action: AuditAction;
  entityType: "user" | "lesson" | "payment" | "coupon" | "school" | "settings" | "licenseGrant";
  entityId: string;
  createdAt: string;
  details?: Record<string, unknown>;
};

export type AppSetting = {
  key: string;
  value: unknown;
  updatedAt: string;
  updatedByUserId?: string;
};

export type OutboxEvent = {
  id: string;
  type:
    | "user_register"
    | "user_update"
    | "user_delete"
    | "teacher_register"
    | "teacher_approved"
    | "teacher_suspended"
    | "school_upsert"
    | "lesson_upsert"
    | "lesson_upsert_full"
    | "lesson_submit"
    | "lesson_approved"
    | "lesson_rejected"
    | "payment_recorded"
    | "payment_verified"
    | "payment_rejected"
    | "license_grant_upsert"
    | "coupon_upsert"
    | "coupons_bulk_upsert"
    | "settings_push"
    | "coupon_redeemed"
    | "message_send"
    | "progress_updated";
  payload: unknown;
  createdAt: string;
  syncStatus: "queued" | "synced" | "failed";
  lastError?: string;
};
