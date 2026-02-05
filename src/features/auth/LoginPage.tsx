import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
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
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <div className="mx-auto max-w-md">
      <Card title="Login">
        <form
          className="space-y-3"
          onSubmit={handleSubmit(async (values) => {
            setFormError(null);
            const res = await login(values);
            if (!res.ok) {
              setFormError(res.error);
              return;
            }
            if (res.user.role === "student") nav(`/student${search}`, { replace: true });
            else if (res.user.role === "teacher") nav(`/teacher${search}`, { replace: true });
            else if (res.user.role === "admin") nav(`/admin${search}`, { replace: true });
            else if (res.user.role === "school_admin") nav(`/school${search}`, { replace: true });
            else nav(`/${search}`, { replace: true });
          })}
        >
          <Input label="Username" error={errors.username?.message} {...register("username")} />
          <Input
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
          />
          {formError ? <div className="text-sm text-rose-400">{formError}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Logging in…" : "Login"}
          </Button>
          <div className="text-xs text-slate-400">
            Seeded accounts: <span className="font-mono">admin/admin123</span>,{" "}
            <span className="font-mono">teacher1/teacher123</span>
          </div>
        </form>
      </Card>
    </div>
  );
}
