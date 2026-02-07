import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getSafeNextFromSearch } from "@/features/auth/nextRoute";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

const schema = z.object({
  displayName: z.string().min(1, "Required"),
  username: z.string().min(3, "Min 3 characters"),
  password: z.string().min(6, "Min 6 characters"),
  schoolCode: z.string().optional(),
  isMinor: z.boolean().optional()
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";
  const { register: doRegister } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isMinor: false }
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_460px]">
      <Card className="hidden lg:block" paper="secondary">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-action-primary/15 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-action-primary-active">
            Student onboarding
          </div>
          <h2 className="text-display text-text-title">Create your SomaSmart account.</h2>
          <p className="text-body text-text-subtle">
            Start learning with curriculum-structured lessons, progress tracking, and offline-first access.
          </p>
          <div className="paper-primary p-4">
            <div className="text-sm font-semibold text-text-title">Need teacher access?</div>
            <div className="mt-1 text-xs text-text-subtle">
              Teachers are created by School Admins and approved by System Admins.
            </div>
          </div>
        </div>
      </Card>
      <Card title="Register">
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            setFormError(null);
            const res = await doRegister(values);
            if (!res.ok) {
              setFormError(res.error);
              return;
            }
            const next = getSafeNextFromSearch(search);
            nav(`${next ?? "/"}${search}`, { replace: true });
          })}
        >
          <Input label="Full name" error={errors.displayName?.message} {...register("displayName")} />
          <Input label="Username" error={errors.username?.message} {...register("username")} />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="School code (optional)"
            error={errors.schoolCode?.message}
            {...register("schoolCode")}
          />
          <label className="flex items-center gap-2 rounded-md border border-border-subtle bg-paper-2 px-3 py-2 text-sm text-text-body">
            <input type="checkbox" className="h-4 w-4" {...register("isMinor")} />
            Student is a minor (parental controls)
          </label>
          {formError ? <div className="rounded-md bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{formError}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating…" : "Register"}
          </Button>
        </form>
        <div className="mt-4 text-xs text-text-subtle">
          Teachers are created by your School Admin and approved by the System Admin.
        </div>
      </Card>
    </div>
  );
}
