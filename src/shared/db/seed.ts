import { db } from "@/shared/db/db";
import type {
  Coupon,
  CurriculumCategory,
  CurriculumClass,
  CurriculumLevel,
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

  const lvlPrimary: CurriculumLevel = {
    id: "lvl_seed_primary",
    name: "Primary",
    sortOrder: 2,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lvlPreschool: CurriculumLevel = {
    id: "lvl_seed_preschool",
    name: "Preschool",
    sortOrder: 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lvlSecondary: CurriculumLevel = {
    id: "lvl_seed_secondary",
    name: "Secondary",
    sortOrder: 3,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lvlHigh: CurriculumLevel = {
    id: "lvl_seed_high",
    name: "High",
    sortOrder: 4,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lvlUniversity: CurriculumLevel = {
    id: "lvl_seed_university",
    name: "University",
    sortOrder: 5,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const clsPrimary1: CurriculumClass = {
    id: "cls_seed_primary_1",
    levelId: lvlPrimary.id,
    name: "Class 1",
    sortOrder: 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const primaryClasses: CurriculumClass[] = Array.from({ length: 7 }).map((_, i) => ({
    id: `cls_seed_primary_${i + 1}`,
    levelId: lvlPrimary.id,
    name: `Class ${i + 1}`,
    sortOrder: i + 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  }));

  const clsPreschool1: CurriculumClass = {
    id: "cls_seed_preschool_1",
    levelId: lvlPreschool.id,
    name: "Pre-1",
    sortOrder: 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const clsPreschool2: CurriculumClass = {
    id: "cls_seed_preschool_2",
    levelId: lvlPreschool.id,
    name: "Pre-2",
    sortOrder: 2,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const clsSecondary1: CurriculumClass = {
    id: "cls_seed_secondary_1",
    levelId: lvlSecondary.id,
    name: "Form 1",
    sortOrder: 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const secondaryClasses: CurriculumClass[] = Array.from({ length: 4 }).map((_, i) => ({
    id: `cls_seed_secondary_${i + 1}`,
    levelId: lvlSecondary.id,
    name: `Form ${i + 1}`,
    sortOrder: i + 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  }));

  const clsHigh5: CurriculumClass = {
    id: "cls_seed_high_5",
    levelId: lvlHigh.id,
    name: "Form 5",
    sortOrder: 5,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const highClasses: CurriculumClass[] = [
    { ...clsHigh5 },
    {
      id: "cls_seed_high_6",
      levelId: lvlHigh.id,
      name: "Form 6",
      sortOrder: 6,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    }
  ];

  const clsUniversity1: CurriculumClass = {
    id: "cls_seed_university_1",
    levelId: lvlUniversity.id,
    name: "Year 1",
    sortOrder: 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const universityClasses: CurriculumClass[] = Array.from({ length: 4 }).map((_, i) => ({
    id: `cls_seed_university_${i + 1}`,
    levelId: lvlUniversity.id,
    name: `Year ${i + 1}`,
    sortOrder: i + 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  }));

  const subMathPrimary: CurriculumSubject = {
    id: "sub_seed_math_primary",
    classId: clsPrimary1.id,
    categoryId: catMath.id,
    name: "Math",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const subIctPrimary: CurriculumSubject = {
    id: "sub_seed_ict_primary",
    classId: clsPrimary1.id,
    categoryId: catIct.id,
    name: "ICT",
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const lessonId = "lesson_seed_numbers";
  const lesson: Lesson = {
    id: lessonId,
    title: "Introduction to Numbers",
    schoolId: school.id,
    curriculumLevelId: lvlPrimary.id,
    curriculumClassId: clsPrimary1.id,
    subject: "Math",
    className: clsPrimary1.name,
    curriculumSubjectId: subMathPrimary.id,
    level: lvlPrimary.name,
    language: "en",
    tags: ["numbers", "basics", "trial"],
    description: "Learn counting from 1 to 10.",
    status: "approved",
    createdByUserId: teacher.id,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  };

  const blocks: LessonBlock[] = [
    { id: "block_seed_numbers_1", type: "text", variant: "body", text: "Count with me: 1, 2, 3..." }
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
      db.curriculumLevels,
      db.curriculumClasses,
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
      await db.curriculumLevels.put(lvlPreschool);
      await db.curriculumLevels.put(lvlPrimary);
      await db.curriculumLevels.put(lvlSecondary);
      await db.curriculumLevels.put(lvlHigh);
      await db.curriculumLevels.put(lvlUniversity);

      await db.curriculumClasses.put(clsPreschool1);
      await db.curriculumClasses.put(clsPreschool2);
      await db.curriculumClasses.bulkPut(primaryClasses);
      await db.curriculumClasses.bulkPut(secondaryClasses);
      await db.curriculumClasses.bulkPut(highClasses);
      await db.curriculumClasses.bulkPut(universityClasses);
      await db.curriculumSubjects.put(subMathPrimary);
      await db.curriculumSubjects.put(subIctPrimary);

      await db.lessons.put(lesson);
      await db.lessonContents.put({ lessonId, blocks });
      await db.quizzes.put(quiz);
      await db.coupons.put(coupon);
    }
  );
}
