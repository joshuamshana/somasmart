import { z } from "zod";
import { isDobInRangeForRole, isValidMobile, normalizeMobile, requiresStudentGuardian } from "@/shared/kyc/kyc";

const genderValues = ["male", "female", "other", "prefer_not_to_say"] as const;
const studentLevelValues = ["primary", "secondary", "high", "college", "uni", "other"] as const;

export const genderSchema = z.enum(genderValues);
export const studentLevelSchema = z.enum(studentLevelValues);

const requiredString = z.string().trim().min(1, "Required");

const mobileSchema = requiredString
  .transform((value) => normalizeMobile(value))
  .refine((value) => isValidMobile(value), "Enter a valid mobile number");

const dateOfBirthSchema = requiredString
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .refine((value) => isDobInRangeForRole("student", value), "Enter a valid date of birth");

export const baseKycSchema = z.object({
  mobile: mobileSchema,
  address: z.object({
    country: requiredString,
    region: requiredString,
    street: requiredString
  }),
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema.optional()
});

export const studentKycSchema = z.object({
  studentLevel: studentLevelSchema,
  studentLevelOther: z.string().trim().optional(),
  schoolName: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianMobile: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? normalizeMobile(value) : value))
});

export function validateRoleDob(role: "student" | "teacher" | "admin" | "school_admin") {
  return requiredString
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .refine((value) => isDobInRangeForRole(role, value), "Date of birth is out of allowed range");
}

export function applyStudentKycRules(
  input: {
    studentLevel?: string;
    studentLevelOther?: string;
    schoolName?: string;
    guardianName?: string;
    guardianMobile?: string;
    isMinor?: boolean;
  },
  ctx: z.RefinementCtx,
  options?: { requireSchoolName?: boolean }
) {
  const requireSchoolName = Boolean(options?.requireSchoolName);
  if (!input.studentLevel) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentLevel"], message: "Select level" });
  }
  if (input.studentLevel === "other" && !input.studentLevelOther?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["studentLevelOther"], message: "Enter level" });
  }
  if (requireSchoolName && !input.schoolName?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["schoolName"], message: "Enter school name" });
  }
  if (requiresStudentGuardian(Boolean(input.isMinor))) {
    if (!input.guardianName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardianName"], message: "Enter guardian name" });
    }
    if (!input.guardianMobile?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardianMobile"], message: "Enter guardian mobile" });
    } else if (!isValidMobile(input.guardianMobile)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardianMobile"], message: "Enter a valid mobile number" });
    }
  }
}

export const baseKycDefaultValues = {
  mobile: "",
  address: {
    country: "",
    region: "",
    street: ""
  },
  dateOfBirth: "",
  gender: undefined as z.infer<typeof genderSchema> | undefined
};

