import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getHomePathForUser } from "@/features/auth/homeRoute";
import { getSafeNextFromSearch } from "@/features/auth/nextRoute";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required")
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const search = location.search ?? "";
  const { user, loading, login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (loading && !user) return;
    if (!user) return;
    const next = user.role === "student" ? getSafeNextFromSearch(search) : null;
    nav(`${next ?? getHomePathForUser(user)}${search}`, { replace: true });
  }, [loading, nav, search, user]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <Card className="hidden lg:block" paper="secondary">
        <div className="space-y-4">
          <div className="inline-flex rounded-full bg-action-primary/15 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-action-primary-active">
            Welcome back
          </div>
          <h2 className="text-display text-text-title">Continue your learning and teaching flow.</h2>
          <p className="max-w-xl text-body text-text-subtle">
            Access your dashboard, lessons, approvals, and progress tracking with one secure login.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Students</div>
              <div className="mt-1 text-xs text-text-subtle">Track progress and continue lessons.</div>
            </div>
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Teachers</div>
              <div className="mt-1 text-xs text-text-subtle">Author and submit lessons efficiently.</div>
            </div>
            <div className="paper-primary p-3">
              <div className="text-sm font-semibold text-text-title">Admins</div>
              <div className="mt-1 text-xs text-text-subtle">Oversee approvals, licenses, and operations.</div>
            </div>
          </div>
        </div>
      </Card>
      <Card title="Login">
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            setFormError(null);
            const res = await login(values);
            if (!res.ok) {
              setFormError(res.error);
              return;
            }
            const next = res.user.role === "student" ? getSafeNextFromSearch(search) : null;
            nav(`${next ?? getHomePathForUser(res.user)}${search}`, { replace: true });
          })}
        >
          <Input label="Username" error={errors.username?.message} {...register("username")} />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          {formError ? <div className="rounded-md bg-status-danger-bg px-3 py-2 text-sm text-status-danger">{formError}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging in…" : "Login"}
          </Button>
          <div className="rounded-md bg-paper-2 px-3 py-2 text-xs text-text-subtle">
            Seeded accounts: <span className="font-mono text-text-title">admin/admin123</span>,{" "}
            <span className="font-mono text-text-title">teacher1/teacher123</span>
          </div>
        </form>
      </Card>
    </div>
  );
}
