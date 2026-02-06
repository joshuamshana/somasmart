import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/shared/db/db";
import type {
  AppSetting,
  AccessPolicy,
  CurriculumCategory,
  CurriculumClass,
  CurriculumLevel,
  CurriculumSubject
} from "@/shared/types";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useAuth } from "@/features/auth/authContext";
import { logAudit } from "@/shared/audit/audit";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { PageHeader } from "@/shared/ui/PageHeader";

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type BackupBundleV1 = {
  version: 1;
  exportedAt: string;
  device?: string | null;
  tables: Record<string, unknown>;
};

async function exportBackup(): Promise<BackupBundleV1> {
  const lessonAssets = await db.lessonAssets.toArray();
  const lessonAssetsExport = await Promise.all(
    lessonAssets.map(async (a) => {
      const bytes = new Uint8Array(await a.blob.arrayBuffer());
      return {
        ...a,
        blobBase64: toBase64(bytes),
        blob: undefined
      };
    })
  );

  return {
    version: 1,
    exportedAt: nowIso(),
    tables: {
      users: await db.users.toArray(),
      schools: await db.schools.toArray(),
      curriculumCategories: await db.curriculumCategories.toArray(),
      curriculumLevels: await db.curriculumLevels.toArray(),
      curriculumClasses: await db.curriculumClasses.toArray(),
      curriculumSubjects: await db.curriculumSubjects.toArray(),
      lessons: await db.lessons.toArray(),
      lessonContents: await db.lessonContents.toArray(),
      lessonAssets: lessonAssetsExport,
      quizzes: await db.quizzes.toArray(),
      progress: await db.progress.toArray(),
      quizAttempts: await db.quizAttempts.toArray(),
      payments: await db.payments.toArray(),
      licenseGrants: await db.licenseGrants.toArray(),
      coupons: await db.coupons.toArray(),
      messages: await db.messages.toArray(),
      notifications: await db.notifications.toArray(),
      streaks: await db.streaks.toArray(),
      badges: await db.badges.toArray(),
      auditLogs: await db.auditLogs.toArray(),
      settings: await db.settings.toArray(),
      outboxEvents: await db.outboxEvents.toArray()
    }
  };
}

async function importBackup(bundle: BackupBundleV1) {
  if (bundle.version !== 1) throw new Error("Unsupported backup version.");
  const t = bundle.tables as any;
  const lessonAssets = (t.lessonAssets ?? []).map((a: any) => {
    const bytes = fromBase64(a.blobBase64 ?? "");
    return { ...a, blob: new Blob([bytes], { type: a.mime }), blobBase64: undefined };
  });

  await db.transaction(
    "rw",
    [
      db.users,
      db.schools,
      db.curriculumCategories,
      db.curriculumLevels,
      db.curriculumClasses,
      db.curriculumSubjects,
      db.lessons,
      db.lessonContents,
      db.lessonAssets,
      db.quizzes,
      db.progress,
      db.quizAttempts,
      db.payments,
      db.licenseGrants,
      db.coupons,
      db.messages,
      db.notifications,
      db.streaks,
      db.badges,
      db.auditLogs,
      db.settings,
      db.outboxEvents
    ],
    async () => {
      await Promise.all([
        db.users.clear(),
        db.schools.clear(),
        db.curriculumCategories.clear(),
        db.curriculumLevels.clear(),
        db.curriculumClasses.clear(),
        db.curriculumSubjects.clear(),
        db.lessons.clear(),
        db.lessonContents.clear(),
        db.lessonAssets.clear(),
        db.quizzes.clear(),
        db.progress.clear(),
        db.quizAttempts.clear(),
        db.payments.clear(),
        db.licenseGrants.clear(),
        db.coupons.clear(),
        db.messages.clear(),
        db.notifications.clear(),
        db.streaks.clear(),
        db.badges.clear(),
        db.auditLogs.clear(),
        db.settings.clear(),
        db.outboxEvents.clear()
      ]);

      await db.users.bulkPut(t.users ?? []);
      await db.schools.bulkPut(t.schools ?? []);
      await db.curriculumCategories.bulkPut(t.curriculumCategories ?? []);
      await db.curriculumLevels.bulkPut(t.curriculumLevels ?? []);
      await db.curriculumClasses.bulkPut(t.curriculumClasses ?? []);
      await db.curriculumSubjects.bulkPut(t.curriculumSubjects ?? []);
      await db.lessons.bulkPut(t.lessons ?? []);
      await db.lessonContents.bulkPut(t.lessonContents ?? []);
      await db.lessonAssets.bulkPut(lessonAssets ?? []);
      await db.quizzes.bulkPut(t.quizzes ?? []);
      await db.progress.bulkPut(t.progress ?? []);
      await db.quizAttempts.bulkPut(t.quizAttempts ?? []);
      await db.payments.bulkPut(t.payments ?? []);
      await db.licenseGrants.bulkPut(t.licenseGrants ?? []);
      await db.coupons.bulkPut(t.coupons ?? []);
      await db.messages.bulkPut(t.messages ?? []);
      await db.notifications.bulkPut(t.notifications ?? []);
      await db.streaks.bulkPut(t.streaks ?? []);
      await db.badges.bulkPut(t.badges ?? []);
      await db.auditLogs.bulkPut(t.auditLogs ?? []);
      await db.settings.bulkPut(t.settings ?? []);
      await db.outboxEvents.bulkPut(t.outboxEvents ?? []);
    }
  );
}

async function upsertSetting(key: string, value: unknown, updatedByUserId?: string) {
  const row: AppSetting = { key, value, updatedAt: nowIso(), updatedByUserId };
  await db.settings.put(row);
  return row;
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description?: string;
    confirmLabel: string;
    danger?: boolean;
    requireText?: string;
    run: () => Promise<void>;
  }>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const systemDraftTouchedRef = useRef(false);
  const [autoSyncMinutes, setAutoSyncMinutes] = useState("0");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [maxImageMb, setMaxImageMb] = useState("10");
  const [maxAudioMb, setMaxAudioMb] = useState("20");
  const [maxVideoMb, setMaxVideoMb] = useState("50");
  const [maxPdfMb, setMaxPdfMb] = useState("20");
  const [maxPptxMb, setMaxPptxMb] = useState("20");

  const [categories, setCategories] = useState<CurriculumCategory[]>([]);
  const [levels, setLevels] = useState<CurriculumLevel[]>([]);
  const [classes, setClasses] = useState<CurriculumClass[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);

  const [catName, setCatName] = useState("");
  const [levelName, setLevelName] = useState("");
  const [levelSortOrder, setLevelSortOrder] = useState("1");
  const [className, setClassName] = useState("");
  const [classSortOrder, setClassSortOrder] = useState("1");
  const [subName, setSubName] = useState("");
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);

  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Access defaults selection is separate from curriculum CRUD selection.
  const [accessLevelId, setAccessLevelId] = useState<string>("");
  const [accessClassId, setAccessClassId] = useState<string>("");
  const [selectedAccessSubjectId, setSelectedAccessSubjectId] = useState<string>("");
  const [selectedAccessPolicy, setSelectedAccessPolicy] = useState<AccessPolicy>("coupon");
  const [accessMsg, setAccessMsg] = useState<string | null>(null);

  async function refreshSystem(opts?: { force?: boolean }) {
    const settings = await db.settings.toArray();
    const get = (k: string) => settings.find((s) => s.key === k)?.value;
    if (!opts?.force && systemDraftTouchedRef.current) return;
    setAutoSyncMinutes(String(get("sync.autoIntervalMinutes") ?? "0"));
    setNotificationsEnabled(Boolean(get("notifications.enabled") ?? true));
    setMaxImageMb(String(get("media.maxUploadMb.image") ?? "10"));
    setMaxAudioMb(String(get("media.maxUploadMb.audio") ?? "20"));
    setMaxVideoMb(String(get("media.maxUploadMb.video") ?? "50"));
    setMaxPdfMb(String(get("media.maxUploadMb.pdf") ?? "20"));
    setMaxPptxMb(String(get("media.maxUploadMb.pptx") ?? "20"));
  }

  async function refreshCurriculum() {
    const cats = (await db.curriculumCategories.toArray()).filter((c) => !c.deletedAt);
    setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
    const lvls = (await db.curriculumLevels.toArray()).filter((l) => !l.deletedAt);
    setLevels(lvls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    const cls = (await db.curriculumClasses.toArray()).filter((c) => !c.deletedAt);
    setClasses(cls.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
    const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
    setSubjects(subs.sort((a, b) => a.name.localeCompare(b.name)));
  }

  useEffect(() => {
    void refreshSystem();
    void refreshCurriculum();
  }, []);

  const classesForSelectedLevel = useMemo(
    () => classes.filter((c) => c.levelId === selectedLevelId && !c.deletedAt),
    [classes, selectedLevelId]
  );

  const subjectsForSelectedClass = useMemo(
    () => subjects.filter((s) => s.classId === selectedClassId && !s.deletedAt),
    [subjects, selectedClassId]
  );

  const classesForAccessLevel = useMemo(
    () => classes.filter((c) => c.levelId === accessLevelId && !c.deletedAt),
    [classes, accessLevelId]
  );

  const subjectsForAccessClass = useMemo(
    () => subjects.filter((s) => s.classId === accessClassId && !s.deletedAt),
    [subjects, accessClassId]
  );

  useEffect(() => {
    if (levels.length === 0) return;
    if (selectedLevelId && levels.some((l) => l.id === selectedLevelId)) return;
    setSelectedLevelId(levels[0].id);
  }, [levels, selectedLevelId]);

  useEffect(() => {
    if (levels.length === 0) return;
    if (accessLevelId && levels.some((l) => l.id === accessLevelId)) return;
    setAccessLevelId(levels[0].id);
  }, [levels, accessLevelId]);

  useEffect(() => {
    if (!selectedLevelId) {
      if (selectedClassId) setSelectedClassId("");
      return;
    }
    if (classesForSelectedLevel.length === 0) {
      if (selectedClassId) setSelectedClassId("");
      return;
    }
    if (selectedClassId && classesForSelectedLevel.some((c) => c.id === selectedClassId)) return;
    setSelectedClassId(classesForSelectedLevel[0].id);
  }, [classesForSelectedLevel, selectedClassId, selectedLevelId]);

  useEffect(() => {
    if (!accessLevelId) {
      if (accessClassId) setAccessClassId("");
      return;
    }
    if (classesForAccessLevel.length === 0) {
      if (accessClassId) setAccessClassId("");
      return;
    }
    if (accessClassId && classesForAccessLevel.some((c) => c.id === accessClassId)) return;
    setAccessClassId(classesForAccessLevel[0].id);
  }, [classesForAccessLevel, accessClassId, accessLevelId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccessMsg(null);
      if (!selectedAccessSubjectId) return;
      const key = `access.subjectDefault.${selectedAccessSubjectId}`;
      const row = await db.settings.get(key);
      const policy = (row?.value as any)?.policy as AccessPolicy | undefined;
      if (cancelled) return;
      setSelectedAccessPolicy(policy === "free" || policy === "coupon" ? policy : "coupon");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAccessSubjectId]);

  useEffect(() => {
    if (subCategoryId !== null) return;
    if (categories.length === 0) return;
    setSubCategoryId(categories[0].id);
  }, [categories, subCategoryId]);

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? "Confirm"}
        danger={confirm?.danger}
        requireText={confirm?.requireText}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const run = confirm?.run;
          setConfirm(null);
          if (run) await run();
        }}
      />

      <PageHeader
        title="Settings"
        description="Manage device settings, curriculum structure, backups, and maintenance tools."
      />

      <Card title="System settings">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Auto sync interval minutes (0 = off)"
            value={autoSyncMinutes}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setAutoSyncMinutes(e.target.value);
            }}
          />
          <label className="flex items-center gap-2 text-sm text-muted self-end">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notificationsEnabled}
              onChange={(e) => {
                systemDraftTouchedRef.current = true;
                setNotificationsEnabled(e.target.checked);
              }}
            />
            Notifications enabled
          </label>
          <div className="self-end">
            <Button
              variant="secondary"
              onClick={() =>
                setConfirm({
                  title: "Save settings?",
                  description: "These settings affect only this device in MVP.",
                  confirmLabel: "Save",
                  run: async () => {
                    setMsg(null);
                    await upsertSetting("sync.autoIntervalMinutes", Number(autoSyncMinutes || "0"), user?.id);
                    await upsertSetting("notifications.enabled", Boolean(notificationsEnabled), user?.id);
                    await upsertSetting("media.maxUploadMb.image", Number(maxImageMb || "10"), user?.id);
                    await upsertSetting("media.maxUploadMb.audio", Number(maxAudioMb || "20"), user?.id);
                    await upsertSetting("media.maxUploadMb.video", Number(maxVideoMb || "50"), user?.id);
                    await upsertSetting("media.maxUploadMb.pdf", Number(maxPdfMb || "20"), user?.id);
                    await upsertSetting("media.maxUploadMb.pptx", Number(maxPptxMb || "20"), user?.id);
                      await enqueueOutboxEvent({ type: "settings_push", payload: {} });
                      setMsg("Settings saved.");
                      if (user) {
                      await logAudit({
                        actorUserId: user.id,
                        action: "settings_update",
                        entityType: "settings",
                        entityId: "device",
                        details: { autoSyncMinutes, notificationsEnabled }
                      });
                    }
                    systemDraftTouchedRef.current = false;
                    await refreshSystem({ force: true });
                  }
                })
              }
            >
              Save settings
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input
            label="Max image MB"
            value={maxImageMb}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setMaxImageMb(e.target.value);
            }}
          />
          <Input
            label="Max audio MB"
            value={maxAudioMb}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setMaxAudioMb(e.target.value);
            }}
          />
          <Input
            label="Max video MB"
            value={maxVideoMb}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setMaxVideoMb(e.target.value);
            }}
          />
          <Input
            label="Max PDF MB"
            value={maxPdfMb}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setMaxPdfMb(e.target.value);
            }}
          />
          <Input
            label="Max PPTX MB"
            value={maxPptxMb}
            onChange={(e) => {
              systemDraftTouchedRef.current = true;
              setMaxPptxMb(e.target.value);
            }}
          />
        </div>
        {msg ? <div className="mt-3 text-sm text-text">{msg}</div> : null}
      </Card>

      <Card title="Curriculum (levels → classes → subjects)">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-text">Levels</div>
            <div className="grid gap-3">
              <Input label="New level name" value={levelName} onChange={(e) => setLevelName(e.target.value)} />
              <Input
                label="Level sort order"
                value={levelSortOrder}
                onChange={(e) => setLevelSortOrder(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  const name = levelName.trim();
                  if (!name) return;
                  const sortOrder = Number(levelSortOrder || "1");
                  const row: CurriculumLevel = {
                    id: newId("lvl"),
                    name,
                    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 1,
                    createdAt: nowIso(),
                    updatedAt: nowIso()
                  };
                  await db.curriculumLevels.put(row);
                  setLevelName("");
                  await enqueueOutboxEvent({ type: "settings_push", payload: {} });
                  if (user) {
                    await logAudit({
                      actorUserId: user.id,
                      action: "curriculum_update",
                      entityType: "settings",
                      entityId: "curriculum",
                      details: { createLevel: { name, sortOrder } }
                    });
                  }
                  await refreshCurriculum();
                }}
              >
                Add level
              </Button>
            </div>

            <div className="space-y-2">
              {levels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSelectedLevelId(l.id);
                    setSelectedClassId("");
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedLevelId === l.id
                      ? "border-brand bg-surface2"
                      : "border-border bg-surface hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-text">{l.name}</div>
                    <div className="text-xs text-muted">#{l.sortOrder}</div>
                  </div>
                </button>
              ))}
              {levels.length === 0 ? <div className="text-sm text-muted">No levels yet.</div> : null}
            </div>

            <Button
              variant="danger"
              disabled={!selectedLevelId}
              onClick={() => {
                const levelRow = levels.find((x) => x.id === selectedLevelId);
                if (!levelRow) return;
                const hasChildren = classes.some((c) => c.levelId === levelRow.id && !c.deletedAt);
                if (hasChildren) {
                  setMsg("Cannot delete a level that still has classes. Delete classes first.");
                  return;
                }
                setConfirm({
                  title: "Delete level?",
                  description: "This will remove the level from curriculum selection (soft delete).",
                  confirmLabel: "Delete",
                  danger: true,
                  requireText: "DELETE",
                  run: async () => {
                    const row = await db.curriculumLevels.get(levelRow.id);
                    if (!row) return;
                    await db.curriculumLevels.put({ ...row, deletedAt: nowIso(), updatedAt: nowIso() });
                    await enqueueOutboxEvent({ type: "settings_push", payload: {} });
                    if (user) {
                      await logAudit({
                        actorUserId: user.id,
                        action: "curriculum_delete",
                        entityType: "settings",
                        entityId: "curriculum",
                        details: { deleteLevelId: levelRow.id }
                      });
                    }
                    setSelectedLevelId("");
                    setSelectedClassId("");
                    await refreshCurriculum();
                  }
                });
              }}
            >
              Delete selected level
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-text">Classes</div>
            <Select
              label="Level"
              value={selectedLevelId}
              onChange={(e) => {
                setSelectedLevelId(e.target.value);
                setSelectedClassId("");
              }}
            >
              <option value="">Select level…</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>

            <div className="grid gap-3">
              <Input label="New class name" value={className} onChange={(e) => setClassName(e.target.value)} />
              <Input
                label="Class sort order"
                value={classSortOrder}
                onChange={(e) => setClassSortOrder(e.target.value)}
              />
              <Button
                variant="secondary"
                disabled={!selectedLevelId}
                onClick={async () => {
                  if (!selectedLevelId) return;
                  const name = className.trim();
                  if (!name) return;
                  const sortOrder = Number(classSortOrder || "1");
                  const row: CurriculumClass = {
                    id: newId("cls"),
                    levelId: selectedLevelId,
                    name,
                    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 1,
                    createdAt: nowIso(),
                    updatedAt: nowIso()
                  };
                  await db.curriculumClasses.put(row);
                  setClassName("");
                  await enqueueOutboxEvent({ type: "settings_push", payload: {} });
                  if (user) {
                    await logAudit({
                      actorUserId: user.id,
                      action: "curriculum_update",
                      entityType: "settings",
                      entityId: "curriculum",
                      details: { createClass: { levelId: selectedLevelId, name, sortOrder } }
                    });
                  }
                  await refreshCurriculum();
                }}
              >
                Add class
              </Button>
            </div>

            <div className="space-y-2">
              {classesForSelectedLevel.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedClassId === c.id
                      ? "border-brand bg-surface2"
                      : "border-border bg-surface hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-text">{c.name}</div>
                    <div className="text-xs text-muted">#{c.sortOrder}</div>
                  </div>
                </button>
              ))}
              {selectedLevelId && classesForSelectedLevel.length === 0 ? (
                <div className="text-sm text-muted">No classes for this level yet.</div>
              ) : null}
            </div>

            <Button
              variant="danger"
              disabled={!selectedClassId}
              onClick={() => {
                const classRow = classes.find((x) => x.id === selectedClassId);
                if (!classRow) return;
                const hasChildren = subjects.some((s) => s.classId === classRow.id && !s.deletedAt);
                if (hasChildren) {
                  setMsg("Cannot delete a class that still has subjects. Delete subjects first.");
                  return;
                }
                setConfirm({
                  title: "Delete class?",
                  description: "This will remove the class from curriculum selection (soft delete).",
                  confirmLabel: "Delete",
                  danger: true,
                  requireText: "DELETE",
                  run: async () => {
                    const row = await db.curriculumClasses.get(classRow.id);
                    if (!row) return;
                    await db.curriculumClasses.put({ ...row, deletedAt: nowIso(), updatedAt: nowIso() });
                    await enqueueOutboxEvent({ type: "settings_push", payload: {} });
                    if (user) {
                      await logAudit({
                        actorUserId: user.id,
                        action: "curriculum_delete",
                        entityType: "settings",
                        entityId: "curriculum",
                        details: { deleteClassId: classRow.id }
                      });
                    }
                    setSelectedClassId("");
                    await refreshCurriculum();
                  }
                });
              }}
            >
              Delete selected class
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-text">Subjects</div>
            <Select
              label="Class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={!selectedLevelId}
            >
              <option value="">Select class…</option>
              {classesForSelectedLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="grid gap-3">
              <Input label="Subject name" value={subName} onChange={(e) => setSubName(e.target.value)} />
              <Select
                label="Category (optional)"
                value={subCategoryId ?? ""}
                onChange={(e) => setSubCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                disabled={!selectedClassId}
                onClick={async () => {
                  if (!selectedClassId) return;
                  const name = subName.trim();
                  if (!name) return;
	                  const row: CurriculumSubject = {
	                    id: newId("sub"),
	                    classId: selectedClassId,
	                    categoryId: (subCategoryId ?? "") || undefined,
	                    name,
	                    createdAt: nowIso(),
	                    updatedAt: nowIso()
	                  };
                  await db.curriculumSubjects.put(row);
                  setSubName("");
                  await enqueueOutboxEvent({ type: "settings_push", payload: {} });
	                  if (user) {
	                    await logAudit({
	                      actorUserId: user.id,
	                      action: "curriculum_update",
	                      entityType: "settings",
	                      entityId: "curriculum",
	                      details: {
	                        createSubject: { classId: selectedClassId, name, categoryId: (subCategoryId ?? "") || null }
	                      }
	                    });
	                  }
	                  await refreshCurriculum();
	                }}
	              >
	                Add subject
	              </Button>
            </div>

            <div className="space-y-2">
              {subjectsForSelectedClass.map((s) => (
                <div
                  key={s.id}
                  data-testid={`subject-row-${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text">{s.name}</div>
                    <div className="mt-1 text-xs text-muted">
                      {categories.find((c) => c.id === s.categoryId)?.name ?? "Uncategorized"}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setConfirm({
                        title: "Delete subject?",
                        description: "This will remove the subject from active curriculum lists on this device.",
                        confirmLabel: "Delete",
                        danger: true,
                        run: async () => {
                          const row = await db.curriculumSubjects.get(s.id);
                          if (!row) return;
                          await db.curriculumSubjects.put({ ...row, deletedAt: nowIso(), updatedAt: nowIso() });
                          await enqueueOutboxEvent({ type: "settings_push", payload: {} });
	                          if (user) {
	                            await logAudit({
	                              actorUserId: user.id,
	                              action: "curriculum_delete",
	                              entityType: "settings",
	                              entityId: "curriculum",
	                              details: { deleteSubjectId: s.id }
	                            });
	                          }
	                          await refreshCurriculum();
	                        }
	                      })
	                    }
	                  >
	                    Delete
                  </Button>
                </div>
              ))}
              {selectedClassId && subjectsForSelectedClass.length === 0 ? (
                <div className="text-sm text-muted">No subjects for this class yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Subject categories (optional)">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="New category name" value={catName} onChange={(e) => setCatName(e.target.value)} />
          <div className="self-end">
            <Button
              variant="secondary"
              onClick={async () => {
                const name = catName.trim();
                if (!name) return;
                const row: CurriculumCategory = {
                  id: newId("cat"),
                  name,
                  createdAt: nowIso(),
                  updatedAt: nowIso()
                };
                await db.curriculumCategories.put(row);
                setCatName("");
                await enqueueOutboxEvent({ type: "settings_push", payload: {} });
	                if (user) {
	                  await logAudit({
	                    actorUserId: user.id,
	                    action: "curriculum_update",
	                    entityType: "settings",
	                    entityId: "curriculum",
	                    details: { createCategory: name }
	                  });
	                }
	                await refreshCurriculum();
	              }}
	            >
	              Add category
	            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
              <div className="font-semibold text-text">{c.name}</div>
              <Button
                variant="danger"
                onClick={() =>
                  setConfirm({
                    title: "Delete category?",
                    description: "Subjects will remain but become uncategorized.",
                    confirmLabel: "Delete",
                    danger: true,
                    requireText: "DELETE",
                    run: async () => {
                      const row = await db.curriculumCategories.get(c.id);
                      if (!row) return;
                      await db.curriculumCategories.put({ ...row, deletedAt: nowIso(), updatedAt: nowIso() });
                      await enqueueOutboxEvent({ type: "settings_push", payload: {} });
	                      if (user) {
	                        await logAudit({
	                          actorUserId: user.id,
	                          action: "curriculum_delete",
	                          entityType: "settings",
	                          entityId: "curriculum",
	                          details: { deleteCategoryId: c.id }
	                        });
	                      }
	                      await refreshCurriculum();
	                    }
	                  })
	                }
	              >
	                Delete
              </Button>
            </div>
          ))}
          {categories.length === 0 ? <div className="text-sm text-muted">No categories yet.</div> : null}
        </div>
      </Card>

      <Card title="Subject access defaults">
        <div className="text-sm text-muted">
          Set the default access policy for a curriculum subject. Individual lessons can still override this.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Select
            label="Level (access defaults)"
            value={accessLevelId}
            onChange={(e) => {
              setAccessLevelId(e.target.value);
              setAccessClassId("");
              setSelectedAccessSubjectId("");
              setAccessMsg(null);
            }}
          >
            <option value="">Select level…</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>

          <Select
            label="Class (access defaults)"
            value={accessClassId}
            onChange={(e) => {
              setAccessClassId(e.target.value);
              setSelectedAccessSubjectId("");
              setAccessMsg(null);
            }}
            disabled={!accessLevelId}
          >
            <option value="">Select class…</option>
            {classesForAccessLevel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Subject (access defaults)"
            value={selectedAccessSubjectId}
            onChange={(e) => setSelectedAccessSubjectId(e.target.value)}
            disabled={!accessClassId}
          >
            <option value="">Select subject…</option>
            {subjectsForAccessClass.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            label="Default access"
            value={selectedAccessPolicy}
            onChange={(e) => setSelectedAccessPolicy(e.target.value as AccessPolicy)}
            disabled={!selectedAccessSubjectId}
          >
            <option value="free">Free</option>
            <option value="coupon">Requires coupon</option>
          </Select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!selectedAccessSubjectId}
            onClick={async () => {
              if (!selectedAccessSubjectId) return;
              setAccessMsg(null);
              const key = `access.subjectDefault.${selectedAccessSubjectId}`;
              const row: AppSetting = {
                key,
                value: { policy: selectedAccessPolicy },
                updatedAt: nowIso(),
                updatedByUserId: user?.id
              };
              await db.settings.put(row);
              await enqueueOutboxEvent({ type: "settings_push", payload: {} });
              if (user) {
                await logAudit({
                  actorUserId: user.id,
                  action: "settings_update",
                  entityType: "settings",
                  entityId: key,
                  details: { policy: selectedAccessPolicy }
                });
              }
              setAccessMsg("Saved subject default access.");
            }}
          >
            Save default
          </Button>

          <Button
            variant="secondary"
            disabled={!selectedAccessSubjectId}
            onClick={async () => {
              if (!selectedAccessSubjectId) return;
              setAccessMsg(null);
              const key = `access.subjectDefault.${selectedAccessSubjectId}`;
              await db.settings.delete(key);
              await enqueueOutboxEvent({ type: "settings_push", payload: {} });
              if (user) {
                await logAudit({
                  actorUserId: user.id,
                  action: "settings_update",
                  entityType: "settings",
                  entityId: key,
                  details: { cleared: true }
                });
              }
              setSelectedAccessPolicy("coupon");
              setAccessMsg("Cleared subject default (lessons will fall back to their own overrides).");
            }}
          >
            Clear default
          </Button>
        </div>

        {accessMsg ? <div className="mt-3 text-sm text-text">{accessMsg}</div> : null}
      </Card>

      <Card title="Backup / restore / reset">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            data-testid="settings-export-backup"
            onClick={async () => {
              const bundle = await exportBackup();
              download(
                `somasmart-backup-${new Date().toISOString().slice(0, 10)}.json`,
                new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" })
              );
              if (user) {
                await logAudit({
                  actorUserId: user.id,
                  action: "backup_export",
                  entityType: "settings",
                  entityId: "backup",
                  details: { exportedAt: bundle.exportedAt }
                });
              }
            }}
          >
            Export backup (JSON)
          </Button>

          <label className="inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm text-muted">
            <input
              type="file"
              accept="application/json"
              data-testid="settings-import-backup"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void (async () => {
                  const text = await file.text();
                  setConfirm({
                    title: "Import backup?",
                    description: "This will overwrite ALL local data on this device.",
                    confirmLabel: "Import",
                    danger: true,
                    requireText: "IMPORT",
                    run: async () => {
                      const parsed = JSON.parse(text) as BackupBundleV1;
                      await importBackup(parsed);
                      if (user) {
                        await logAudit({
                          actorUserId: user.id,
                          action: "backup_import",
                          entityType: "settings",
                          entityId: "backup",
                          details: { importedAt: nowIso() }
                        });
                      }
                      // Import overwrites local IndexedDB; require re-auth to avoid confusing state.
                      localStorage.clear();
                      window.location.href = `/login${window.location.search}`;
                    }
                  });
                })();
              }}
            />
            Import backup (JSON)
          </label>

          <Button
            variant="danger"
            data-testid="settings-reset-device"
            onClick={() =>
              setConfirm({
                title: "Reset this device?",
                description: "This will delete ALL local data stored in IndexedDB on this device.",
                confirmLabel: "Reset",
                danger: true,
                requireText: "RESET",
                run: async () => {
                  if (user) {
                    await logAudit({
                      actorUserId: user.id,
                      action: "settings_reset",
                      entityType: "settings",
                      entityId: "device",
                      details: { at: nowIso() }
                    });
                  }
                  await db.delete();
                  localStorage.clear();
                  window.location.href = `/login${window.location.search}`;
                }
              })
            }
          >
            Reset device
          </Button>
        </div>
        <div className="mt-3 text-xs text-muted">
          Backups include lesson media blobs; large exports may take time.
        </div>
      </Card>
    </div>
  );
}
