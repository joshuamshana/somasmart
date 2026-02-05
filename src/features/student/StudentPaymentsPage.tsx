import React, { useEffect, useState } from "react";
import { Card } from "@/shared/ui/Card";
import { useAuth } from "@/features/auth/authContext";
import { db } from "@/shared/db/db";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import type { Coupon } from "@/shared/types";
import { redeemCoupon, validateCoupon } from "@/shared/access/coupons";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

export function StudentPaymentsPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"coupon" | "voucher">("coupon");
  const [message, setMessage] = useState<string | null>(null);
  const [grants, setGrants] = useState<import("@/shared/types").LicenseGrant[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!user) return;
      const now = new Date().toISOString();
      const g = (await db.licenseGrants.toArray()).filter(
        (x) => x.studentId === user.id && !x.deletedAt && (!x.validUntil || x.validUntil > now)
      );
      if (cancelled) return;
      setGrants(g);
    }
    void refresh();
    const id = window.setInterval(() => void refresh(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  if (!user) return null;
  const userId = user.id;

  async function redeem() {
    setMessage(null);
    const raw = code.trim().toUpperCase();
    if (!raw) {
      setMessage("Enter a code.");
      return;
    }
    const coupon: Coupon | undefined = await db.coupons.get(raw);
    if (!coupon || coupon.deletedAt) {
      setMessage("Invalid code.");
      return;
    }
    const valid = validateCoupon({ coupon, studentId: userId });
    if (!valid.ok) {
      setMessage(valid.error);
      return;
    }
    const { payment, grant, updatedCoupon } = redeemCoupon({ coupon, studentId: userId, method });
    await db.transaction("rw", db.coupons, db.payments, db.licenseGrants, async () => {
      await db.coupons.put(updatedCoupon);
      await db.payments.add(payment);
      await db.licenseGrants.add(grant);
    });
    await enqueueOutboxEvent({ type: "coupon_redeemed", payload: { code: updatedCoupon.code, studentId: userId } });
    await enqueueOutboxEvent({ type: "payment_recorded", payload: { paymentId: payment.id } });
    setCode("");
    setMessage("Access unlocked offline.");
  }

  async function submitMobileMoney(reference: string) {
    if (!reference.trim()) return;
    const paymentId = `pay_${crypto.randomUUID()}`;
    await db.payments.add({
      id: paymentId,
      studentId: userId,
      method: "mobile_money",
      status: "pending",
      reference: reference.trim(),
      createdAt: new Date().toISOString()
    });
    await enqueueOutboxEvent({ type: "payment_recorded", payload: { paymentId } });
    setMessage("Payment recorded as pending verification (sync not implemented yet).");
  }

  return (
    <div className="space-y-4">
      <Card title="Your access">
        <div className="text-sm text-slate-300">
          Active grants: <span className="font-semibold">{grants.length}</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Trial lessons are always available (tagged <span className="font-mono">trial</span>).
        </div>
      </Card>

      <Card title="Redeem Coupon / Voucher">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <div className="mb-1 text-sm text-slate-300">Type</div>
              <select
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as "coupon" | "voucher")}
              >
                <option value="coupon">Coupon</option>
                <option value="voucher">Voucher</option>
              </select>
          </label>
          <div className="md:col-span-2">
            <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={redeem}>Redeem</Button>
          <div className="text-xs text-slate-400">
            Try seeded code: <span className="font-mono">FREE30</span>
          </div>
        </div>
        {message ? <div className="mt-3 text-sm text-slate-200">{message}</div> : null}
      </Card>

      <Card title="Mobile Money (MVP)">
        <div className="text-sm text-slate-300">
          Pay via your provider, then enter the transaction reference below. Verification will happen after sync is implemented.
        </div>
        <MobileMoneyForm onSubmit={submitMobileMoney} />
      </Card>
    </div>
  );
}

function MobileMoneyForm({ onSubmit }: { onSubmit: (ref: string) => Promise<void> }) {
  const [ref, setRef] = useState("");
  return (
    <div className="mt-3 flex gap-3">
      <div className="flex-1">
        <Input label="Transaction reference" value={ref} onChange={(e) => setRef(e.target.value)} />
      </div>
      <div className="self-end">
        <Button
          variant="secondary"
          onClick={() => {
            void onSubmit(ref);
            setRef("");
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
