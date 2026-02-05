import { db } from "@/shared/db/db";
import type {
  Coupon,
  CurriculumCategory,
  CurriculumSubject,
  Lesson,
  LessonBlock,
  Quiz,
  School,
  User
} from "@/shared/types";
import { hashPassword } from "@/shared/security/password";

const SEED_NOW_ISO = "2026-01-01T00:00:00.000Z";
const SEED_FAR_FUTURE_ISO = "2099-12-31T23:59:59.999Z";

export async function seedIfEmpty() {
  const existingAdmin = await db.users.get("user_admin");
  if (existingAdmin) return;

  const admin: User = {
    id: "user_admin",
    role: "admin",
    status: "active",
    displayName: "Admin",
    username: "admin",
    passwordHash: await hashPassword("admin123"),
    createdAt: SEED_NOW_ISO
  };

  const schoolAdmin: User = {
    id: "user_school_admin",
    role: "school_admin",
    status: "active",
    displayName: "School Admin",
    username: "schooladmin",
    passwordHash: await hashPassword("school123"),
    schoolId: "school_seed_1",
    createdAt: SEED_NOW_ISO
  };

  const school: School = {
    id: "school_seed_1",
    name: "SomaSmart Demo School",
    code: "SOMA001",
    createdAt: SEED_NOW_ISO
  };

  const teacher: User = {
    id: "user_teacher1",
    role: "teacher",
    status: "active",
    displayName: "Teacher One",
    username: "teacher1",
    passwordHash: await hashPassword("teacher123"),
    schoolId: school.id,
    createdAt: SEED_NOW_ISO
  };

  const catMath: CurriculumCategory = {
    id: "cat_seed_math",
    name: "Mathematics",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const catIct: CurriculumCategory = {
    id: "cat_seed_ict",
    name: "ICT",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const subMathPrimary: CurriculumSubject = {
    id: "sub_seed_math_primary",
    categoryId: catMath.id,
    name: "Math",
    level: "Primary",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const subIctPrimary: CurriculumSubject = {
    id: "sub_seed_ict_primary",
    categoryId: catIct.id,
    name: "ICT",
    level: "Primary",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lessonId = "lesson_seed_numbers";
  const lesson: Lesson = {
    id: lessonId,
    title: "Introduction to Numbers",
    schoolId: school.id,
    subject: "Math",
    curriculumSubjectId: subMathPrimary.id,
    level: "Primary",
    language: "en",
    tags: ["numbers", "basics", "trial"],
    description: "Learn counting from 1 to 10.",
    status: "approved",
    createdByUserId: teacher.id,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const blocks: LessonBlock[] = [
    { id: "block_seed_numbers_1", type: "text", text: "Count with me: 1, 2, 3..." }
  ];

  const quiz: Quiz = {
    id: "quiz_seed_numbers",
    lessonId,
    questions: [
      {
        id: "q_seed_numbers_1",
        prompt: "What comes after 3?",
        options: ["2", "3", "4", "5"],
        correctOptionIndex: 2,
        explanation: "After 3 comes 4.",
        conceptTags: ["counting"],
        nextSteps: [{ type: "retry_quiz" }, { type: "repeat_lesson" }]
      }
    ]
  };

  const coupon: Coupon = {
    code: "FREE30",
    scope: { type: "full" },
    validFrom: SEED_NOW_ISO,
    validUntil: SEED_FAR_FUTURE_ISO,
    maxRedemptions: 1000,
    redeemedByStudentIds: [],
    active: true
  };

  await db.transaction(
    "rw",
    [
      db.users,
      db.schools,
      db.curriculumCategories,
      db.curriculumSubjects,
      db.lessons,
      db.lessonContents,
      db.quizzes,
      db.coupons
    ],
    async () => {
      await db.users.put(admin);
      await db.users.put(schoolAdmin);
      await db.users.put(teacher);
      await db.schools.put(school);

      await db.curriculumCategories.put(catMath);
      await db.curriculumCategories.put(catIct);
      await db.curriculumSubjects.put(subMathPrimary);
      await db.curriculumSubjects.put(subIctPrimary);

      await db.lessons.put(lesson);
      await db.lessonContents.put({ lessonId, blocks });
      await db.quizzes.put(quiz);
      await db.coupons.put(coupon);
    }
  );
}
