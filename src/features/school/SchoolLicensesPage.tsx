import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/features/auth/authContext";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { db } from "@/shared/db/db";
import type {
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject,
  LicenseGrant,
  LicenseScope,
  Payment,
  User
} from "@/shared/types";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";

const schema = z
  .object({
    studentId: z.string().min(1, "Select a student"),
    scopeType: z.enum(["full", "level", "subject", "curriculum_subject"]),
    level: z.enum(["Preschool", "Primary", "Secondary", "Vocational"]).optional(),
    subject: z.string().optional(),
    curriculumSubjectId: z.string().optional(),
    daysValid: z.coerce.number().int().min(1).max(365)
  })
  .superRefine((v, ctx) => {
    if (v.scopeType === "subject" && !(v.subject ?? "").trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subject"], message: "Enter subject" });
    }
    if (v.scopeType === "curriculum_subject" && !(v.curriculumSubjectId ?? "").trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["curriculumSubjectId"], message: "Select subject" });
    }
  });

type FormValues = z.infer<typeof schema>;

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function plusDays(days: number) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

export function SchoolLicensesPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [grants, setGrants] = useState<LicenseGrant[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scopeType: "full", daysValid: 30, studentId: "", curriculumSubjectId: "" }
  });

  const scopeType = watch("scopeType");
  const studentId = watch("studentId");

  async function refresh() {
    if (!user?.schoolId) return;
    const allUsers = await db.users.toArray();
    const s = allUsers.filter((u) => u.schoolId === user.schoolId && u.role === "student");
    const allGrants = await db.licenseGrants.toArray();
    setStudents(s);
    setGrants(allGrants.filter((g) => s.some((st) => st.id === g.studentId)));
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lvls = (await db.curriculumLevels.toArray()).filter((l) => !l.deletedAt);
      const cls = (await db.curriculumClasses.toArray()).filter((c) => !c.deletedAt);
      const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
      if (cancelled) return;
      setLevels(lvls);
      setClasses(cls);
      setSubjects(subs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const levelsById = useMemo(() => {
    const m: Record<string, CurriculumLevel> = {};
    levels.forEach((l) => (m[l.id] = l));
    return m;
  }, [levels]);

  const classesById = useMemo(() => {
    const m: Record<string, CurriculumClass> = {};
    classes.forEach((c) => (m[c.id] = c));
    return m;
  }, [classes]);

  const curriculumSubjectOptions = useMemo(() => {
    return subjects
      .slice()
      .sort((a, b) => {
        const ac = classesById[a.classId]?.name ?? "";
        const bc = classesById[b.classId]?.name ?? "";
        const al = levelsById[classesById[a.classId]?.levelId ?? ""]?.sortOrder ?? 0;
        const bl = levelsById[classesById[b.classId]?.levelId ?? ""]?.sortOrder ?? 0;
        return al - bl || ac.localeCompare(bc) || a.name.localeCompare(b.name);
      })
      .map((s) => {
        const cls = classesById[s.classId];
        const lvl = cls ? levelsById[cls.levelId] : null;
        const label = [lvl?.name, cls?.name, s.name].filter(Boolean).join(" / ");
        return { id: s.id, label: label || s.name };
      });
  }, [subjects, classesById, levelsById]);

  const grantsForStudent = useMemo(
    () => grants.filter((g) => (studentId ? g.studentId === studentId : true)),
    [grants, studentId]
  );

  if (!user?.schoolId) return <Card title="Licenses">This account is not linked to a school.</Card>;

  return (
    <div className="space-y-4">
      <Card title="Grant sponsored access">
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={handleSubmit(async (values) => {
            setMsg(null);
            let scope: LicenseScope = { type: "full" };
            if (values.scopeType === "level") scope = { type: "level", level: values.level ?? "Primary" };
            if (values.scopeType === "subject") scope = { type: "subject", subject: (values.subject ?? "").trim() };
            if (values.scopeType === "curriculum_subject") {
              scope = { type: "curriculum_subject", curriculumSubjectId: (values.curriculumSubjectId ?? "").trim() };
            }

            const paymentId = newId("pay");
            const payment: Payment = {
              id: paymentId,
              studentId: values.studentId,
              method: "sponsored",
              status: "verified",
              reference: `SPONSORED:${user.schoolId}`,
              createdAt: nowIso()
            };
            const grant: LicenseGrant = {
              id: newId("grant"),
              studentId: values.studentId,
              scope,
              validUntil: plusDays(values.daysValid),
              sourcePaymentId: paymentId,
              createdAt: nowIso()
            };
            await db.transaction("rw", [db.payments, db.licenseGrants], async () => {
              await db.payments.add(payment);
              await db.licenseGrants.add(grant);
            });
            await enqueueOutboxEvent({ type: "payment_recorded", payload: { paymentId } });
            await refresh();
            reset({ ...values });
            setMsg("Sponsored access granted.");
          })}
        >
          <Select label="Student" error={errors.studentId?.message} {...register("studentId")}>
            <option value="">Select…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName} ({s.username})
              </option>
            ))}
          </Select>
          <Select label="Scope" error={errors.scopeType?.message} {...register("scopeType")}>
            <option value="full">Full access</option>
            <option value="level">Level</option>
            <option value="subject">Subject</option>
            <option value="curriculum_subject">Curriculum subject</option>
          </Select>
          {scopeType === "level" ? (
            <Select label="Level" error={errors.level?.message} {...register("level")}>
              <option value="Preschool">Preschool</option>
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
              <option value="Vocational">Vocational</option>
            </Select>
          ) : scopeType === "subject" ? (
            <Input label="Subject" error={errors.subject?.message} {...register("subject")} />
          ) : scopeType === "curriculum_subject" ? (
            <Select label="Curriculum subject" error={errors.curriculumSubjectId?.message} {...register("curriculumSubjectId")}>
              <option value="">Select subject…</option>
              {curriculumSubjectOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          ) : (
            <div />
          )}
          <Input label="Valid days" error={errors.daysValid?.message} {...register("daysValid")} />
          <div className="md:col-span-4 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Grant access"}
            </Button>
            {msg ? <div className="text-sm text-slate-200">{msg}</div> : null}
          </div>
        </form>
      </Card>

      <Card title="Active grants">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">Student</th>
                <th className="py-2">Scope</th>
                <th className="py-2">Valid until</th>
              </tr>
            </thead>
            <tbody>
              {grantsForStudent.map((g) => (
                <tr key={g.id} className="border-t border-slate-800">
                  <td className="py-2">{students.find((s) => s.id === g.studentId)?.displayName ?? g.studentId}</td>
                  <td className="py-2">{formatScope(g.scope)}</td>
                  <td className="py-2">{g.validUntil ? new Date(g.validUntil).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {grantsForStudent.length === 0 ? <div className="text-sm text-slate-400">No grants.</div> : null}
        </div>
      </Card>
    </div>
  );
}

function formatScope(scope: LicenseScope) {
  if (scope.type === "full") return "full";
  if (scope.type === "level") return `level:${scope.level}`;
  if (scope.type === "subject") return `subject:${scope.subject}`;
  return `curriculum_subject:${scope.curriculumSubjectId}`;
}
