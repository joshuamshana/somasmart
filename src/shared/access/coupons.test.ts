import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { redeemCoupon, validateCoupon } from "@/shared/access/coupons";
import type { Coupon } from "@/shared/types";

function buildCoupon(partial?: Partial<Coupon>): Coupon {
  return {
    code: "SAVE100",
    scope: { type: "full" },
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.000Z",
    maxRedemptions: 2,
    redeemedByStudentIds: [],
    active: true,
    ...partial
  };
}

describe("coupons", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects inactive, not-yet-active, expired, duplicate and exhausted coupons", () => {
    expect(validateCoupon({ coupon: buildCoupon({ active: false }), studentId: "s1" })).toEqual({
      ok: false,
      error: "Code inactive."
    });

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    expect(
      validateCoupon({
        coupon: buildCoupon({ validFrom: "2026-01-02T00:00:00.000Z" }),
        studentId: "s1"
      })
    ).toEqual({ ok: false, error: "Code not active yet." });

    vi.setSystemTime(new Date("2026-12-31T23:59:59.001Z"));
    expect(validateCoupon({ coupon: buildCoupon(), studentId: "s1" })).toEqual({
      ok: false,
      error: "Code expired."
    });

    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    expect(
      validateCoupon({
        coupon: buildCoupon({ redeemedByStudentIds: ["s1"] }),
        studentId: "s1"
      })
    ).toEqual({ ok: false, error: "Code already redeemed by you." });

    expect(
      validateCoupon({
        coupon: buildCoupon({ maxRedemptions: 1, redeemedByStudentIds: ["other"] }),
        studentId: "s1"
      })
    ).toEqual({ ok: false, error: "Code fully used." });
  });

  it("accepts valid coupons and redeems into verified payment plus grant", () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    vi.spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
      .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");

    const coupon = buildCoupon();
    expect(validateCoupon({ coupon, studentId: "student_1" })).toEqual({ ok: true });

    const out = redeemCoupon({
      coupon,
      studentId: "student_1",
      method: "coupon"
    });

    expect(out.payment.id).toBe("pay_11111111-1111-1111-1111-111111111111");
    expect(out.payment.status).toBe("verified");
    expect(out.payment.reference).toBe("SAVE100");
    expect(out.grant.id).toBe("grant_22222222-2222-2222-2222-222222222222");
    expect(out.grant.sourcePaymentId).toBe("pay_11111111-1111-1111-1111-111111111111");
    expect(out.updatedCoupon.redeemedByStudentIds).toEqual(["student_1"]);
  });
});
