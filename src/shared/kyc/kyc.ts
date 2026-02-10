import type { Role } from "@/shared/types";

const MAX_AGE = 120;
const MIN_STUDENT_AGE = 3;
const MIN_ADULT_AGE = 18;

function parseDob(dob: string) {
  const trimmed = dob.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function deriveAgeFromDob(dob: string, now = new Date()) {
  const parsed = parseDob(dob);
  if (!parsed) return NaN;
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth() + 1;
  const nowDay = now.getUTCDate();
  let age = nowYear - parsed.year;
  if (nowMonth < parsed.month || (nowMonth === parsed.month && nowDay < parsed.day)) {
    age -= 1;
  }
  return age;
}

export function normalizeMobile(input: string) {
  const trimmed = input.trim();
  const hasPlusPrefix = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
}

export function isValidMobile(input: string) {
  const normalized = normalizeMobile(input);
  return /^\+?[1-9]\d{6,14}$/.test(normalized);
}

export function requiresStudentGuardian(isMinor: boolean) {
  return Boolean(isMinor);
}

export function isDobInRangeForRole(role: Role, dob: string, now = new Date()) {
  const age = deriveAgeFromDob(dob, now);
  if (!Number.isFinite(age)) return false;
  if (age < 0 || age > MAX_AGE) return false;
  if (role === "student") return age >= MIN_STUDENT_AGE;
  return age >= MIN_ADULT_AGE;
}

