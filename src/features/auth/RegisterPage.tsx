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
    <div className="mx-auto max-w-md">
      <Card title="Register">
        <form
          className="space-y-3"
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
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4" {...register("isMinor")} />
            Student is a minor (parental controls)
          </label>
          {formError ? <div className="text-sm text-rose-400">{formError}</div> : null}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating…" : "Register"}
          </Button>
        </form>
        <div className="mt-4 text-xs text-muted">
          Teachers are created by your School Admin and approved by the System Admin.
        </div>
      </Card>
    </div>
  );
}
