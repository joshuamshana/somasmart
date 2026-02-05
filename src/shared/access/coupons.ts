import type { Coupon, LicenseGrant, Payment } from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function validateCoupon({
  coupon,
  studentId
}: {
  coupon: Coupon;
  studentId: string;
}): { ok: true } | { ok: false; error: string } {
  if (!coupon.active) return { ok: false, error: "Code inactive." };
  const now = Date.now();
  if (now < new Date(coupon.validFrom).getTime()) return { ok: false, error: "Code not active yet." };
  if (now > new Date(coupon.validUntil).getTime()) return { ok: false, error: "Code expired." };
  if (coupon.redeemedByStudentIds.includes(studentId)) return { ok: false, error: "Code already redeemed by you." };
  if (coupon.redeemedByStudentIds.length >= coupon.maxRedemptions) return { ok: false, error: "Code fully used." };
  return { ok: true };
}

export function redeemCoupon({
  coupon,
  studentId,
  method
}: {
  coupon: Coupon;
  studentId: string;
  method: "coupon" | "voucher";
}): { payment: Payment; grant: LicenseGrant; updatedCoupon: Coupon } {
  const paymentId = newId("pay");
  const payment: Payment = {
    id: paymentId,
    studentId,
    method,
    status: "verified",
    reference: coupon.code,
    createdAt: nowIso()
  };
  const grant: LicenseGrant = {
    id: newId("grant"),
    studentId,
    scope: coupon.scope,
    validUntil: coupon.validUntil,
    sourcePaymentId: paymentId,
    createdAt: nowIso()
  };
  const updatedCoupon: Coupon = {
    ...coupon,
    redeemedByStudentIds: [...coupon.redeemedByStudentIds, studentId]
  };
  return { payment, grant, updatedCoupon };
}

