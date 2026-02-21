import { db } from "@/shared/db/db";
import type { Coupon, CurriculumCategory, CurriculumClass, CurriculumLevel, CurriculumSubject, School } from "@/shared/types";

const SEED_NOW_ISO = "2026-01-01T00:00:00.000Z";
const SEED_FAR_FUTURE_ISO = "2099-12-31T23:59:59.999Z";

export async function seedIfEmpty() {
  const existingLevel = await db.curriculumLevels.get("lvl_seed_primary");
  if (existingLevel) return;

  const school: School = {
    id: "school_seed_1",
    name: "SomaSmart Demo School",
    code: "SOMA001",
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

  const lvlPreschool: CurriculumLevel = {
    id: "lvl_seed_preschool",
    name: "Preschool",
    sortOrder: 1,
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

  const primaryClasses: CurriculumClass[] = Array.from({ length: 7 }).map((_, i) => ({
    id: `cls_seed_primary_${i + 1}`,
    levelId: lvlPrimary.id,
    name: `Class ${i + 1}`,
    sortOrder: i + 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  }));

  const secondaryClasses: CurriculumClass[] = Array.from({ length: 4 }).map((_, i) => ({
    id: `cls_seed_secondary_${i + 1}`,
    levelId: lvlSecondary.id,
    name: `Form ${i + 1}`,
    sortOrder: i + 1,
    createdAt: SEED_NOW_ISO,
    updatedAt: SEED_NOW_ISO
  }));

  const classes: CurriculumClass[] = [
    {
      id: "cls_seed_preschool_1",
      levelId: lvlPreschool.id,
      name: "Pre-1",
      sortOrder: 1,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    },
    {
      id: "cls_seed_preschool_2",
      levelId: lvlPreschool.id,
      name: "Pre-2",
      sortOrder: 2,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    },
    ...primaryClasses,
    ...secondaryClasses,
    {
      id: "cls_seed_high_5",
      levelId: lvlHigh.id,
      name: "Form 5",
      sortOrder: 5,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    },
    {
      id: "cls_seed_high_6",
      levelId: lvlHigh.id,
      name: "Form 6",
      sortOrder: 6,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    },
    ...Array.from({ length: 4 }).map((_, i) => ({
      id: `cls_seed_university_${i + 1}`,
      levelId: lvlUniversity.id,
      name: `Year ${i + 1}`,
      sortOrder: i + 1,
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    }))
  ];

  const subjects: CurriculumSubject[] = [
    {
      id: "sub_seed_math_primary",
      classId: "cls_seed_primary_1",
      categoryId: catMath.id,
      name: "Math",
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    },
    {
      id: "sub_seed_ict_primary",
      classId: "cls_seed_primary_1",
      categoryId: catIct.id,
      name: "ICT",
      createdAt: SEED_NOW_ISO,
      updatedAt: SEED_NOW_ISO
    }
  ];

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
      db.schools,
      db.curriculumCategories,
      db.curriculumLevels,
      db.curriculumClasses,
      db.curriculumSubjects,
      db.coupons
    ],
    async () => {
      await db.schools.put(school);
      await db.curriculumCategories.bulkPut([catMath, catIct]);
      await db.curriculumLevels.bulkPut([lvlPreschool, lvlPrimary, lvlSecondary, lvlHigh, lvlUniversity]);
      await db.curriculumClasses.bulkPut(classes);
      await db.curriculumSubjects.bulkPut(subjects);
      await db.coupons.put(coupon);
    }
  );
}
