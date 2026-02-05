import React, { useEffect, useMemo, useState } from "react";
import { db } from "@/shared/db/db";
import type {
  AppSetting,
  CurriculumCategory,
  CurriculumSubject
} from "@/shared/types";
import { Card } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
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

  const [autoSyncMinutes, setAutoSyncMinutes] = useState("0");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [maxImageMb, setMaxImageMb] = useState("10");
  const [maxAudioMb, setMaxAudioMb] = useState("20");
  const [maxVideoMb, setMaxVideoMb] = useState("50");
  const [maxPdfMb, setMaxPdfMb] = useState("20");
  const [maxPptxMb, setMaxPptxMb] = useState("20");

  const [categories, setCategories] = useState<CurriculumCategory[]>([]);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [catName, setCatName] = useState("");
  const [subName, setSubName] = useState("");
  const [subLevel, setSubLevel] = useState<CurriculumSubject["level"]>("Primary");
  const [subCategoryId, setSubCategoryId] = useState<string>("");

  async function refresh() {
    const settings = await db.settings.toArray();
    const get = (k: string) => settings.find((s) => s.key === k)?.value;
    setAutoSyncMinutes(String(get("sync.autoIntervalMinutes") ?? "0"));
    setNotificationsEnabled(Boolean(get("notifications.enabled") ?? true));
    setMaxImageMb(String(get("media.maxUploadMb.image") ?? "10"));
    setMaxAudioMb(String(get("media.maxUploadMb.audio") ?? "20"));
    setMaxVideoMb(String(get("media.maxUploadMb.video") ?? "50"));
    setMaxPdfMb(String(get("media.maxUploadMb.pdf") ?? "20"));
    setMaxPptxMb(String(get("media.maxUploadMb.pptx") ?? "20"));

    const cats = (await db.curriculumCategories.toArray()).filter((c) => !c.deletedAt);
    setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
    const subs = (await db.curriculumSubjects.toArray()).filter((s) => !s.deletedAt);
    setSubjects(subs.sort((a, b) => a.name.localeCompare(b.name)));
    if (!subCategoryId && cats.length) setSubCategoryId(cats[0].id);
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subjectsByCat = useMemo(() => {
    const map: Record<string, CurriculumSubject[]> = {};
    for (const s of subjects) {
      map[s.categoryId] ??= [];
      map[s.categoryId].push(s);
    }
    return map;
  }, [subjects]);

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
            onChange={(e) => setAutoSyncMinutes(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-muted self-end">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
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
                    await refresh();
                  }
                })
              }
            >
              Save settings
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Input label="Max image MB" value={maxImageMb} onChange={(e) => setMaxImageMb(e.target.value)} />
          <Input label="Max audio MB" value={maxAudioMb} onChange={(e) => setMaxAudioMb(e.target.value)} />
          <Input label="Max video MB" value={maxVideoMb} onChange={(e) => setMaxVideoMb(e.target.value)} />
          <Input label="Max PDF MB" value={maxPdfMb} onChange={(e) => setMaxPdfMb(e.target.value)} />
          <Input label="Max PPTX MB" value={maxPptxMb} onChange={(e) => setMaxPptxMb(e.target.value)} />
        </div>
        {msg ? <div className="mt-3 text-sm text-text">{msg}</div> : null}
      </Card>

      <Card title="Curriculum (categories + subjects)">
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
                await refresh();
              }}
            >
              Add category
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <div className="mb-1 text-sm text-muted">Category</div>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Subject name" value={subName} onChange={(e) => setSubName(e.target.value)} />
          <label className="block">
            <div className="mb-1 text-sm text-muted">Level</div>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              value={subLevel}
              onChange={(e) => setSubLevel(e.target.value as any)}
            >
              <option value="Preschool">Preschool</option>
              <option value="Primary">Primary</option>
              <option value="Secondary">Secondary</option>
              <option value="Vocational">Vocational</option>
            </select>
          </label>
          <div className="self-end">
            <Button
              variant="secondary"
              onClick={async () => {
                if (!subCategoryId) return;
                const name = subName.trim();
                if (!name) return;
                const row: CurriculumSubject = {
                  id: newId("sub"),
                  categoryId: subCategoryId,
                  name,
                  level: subLevel,
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
                    details: { createSubject: { name, level: subLevel, categoryId: subCategoryId } }
                  });
                }
                await refresh();
              }}
            >
              Add subject
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{c.name}</div>
                <Button
                  variant="danger"
                  onClick={() =>
                    setConfirm({
                      title: "Delete category?",
                      description: "Subjects under this category will remain but become uncategorized in MVP.",
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
                        await refresh();
                      }
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="mt-2 text-sm text-muted">
                {(subjectsByCat[c.id] ?? []).length} subjects
              </div>
              {(subjectsByCat[c.id] ?? []).length ? (
                <div className="mt-3 space-y-2">
                  {(subjectsByCat[c.id] ?? []).map((s) => (
                    <div
                      key={s.id}
                      data-testid={`subject-row-${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface2 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm text-text">{s.name}</div>
                        <div className="text-xs text-muted">{s.level}</div>
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
                              await refresh();
                            }
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
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
