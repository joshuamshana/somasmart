import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/shared/types";
import { db } from "@/shared/db/db";
import { seedIfEmpty } from "@/shared/db/seed";
import { hashPassword, verifyPassword } from "@/shared/security/password";
import { getSchoolByCode } from "@/shared/db/schoolsRepo";
import { enqueueOutboxEvent } from "@/shared/offline/outbox";
import { normalizeMobile } from "@/shared/kyc/kyc";

import { getDeviceId } from "@/shared/device";

function getSessionKey() {
  const device = getDeviceId();
  return device ? `somasmart.session.${device}.userId` : "somasmart.session.userId";
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (
    input: { username: string; password: string }
  ) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  register: (input: {
    displayName: string;
    username: string;
    password: string;
    schoolCode?: string;
    isMinor?: boolean;
    kyc: {
      mobile: string;
      address: { country: string; region: string; street: string };
      dateOfBirth: string;
      gender?: "male" | "female" | "other" | "prefer_not_to_say";
      studentLevel: "primary" | "secondary" | "high" | "college" | "uni" | "other";
      studentLevelOther?: string;
      schoolName?: string;
      guardianName?: string;
      guardianMobile?: string;
    };
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function findUserByUsername(username: string) {
  const lowered = username.trim().toLowerCase();
  const all = await db.users.toArray();
  return all.find((u) => !u.deletedAt && u.username.toLowerCase() === lowered) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const userId = localStorage.getItem(getSessionKey());
    if (!userId) {
      setUser(null);
      return;
    }
    const found = await db.users.get(userId);
    setUser(found ?? null);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await seedIfEmpty();
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login({ username, password }) {
        await seedIfEmpty();
        const found = await findUserByUsername(username);
        if (!found) return { ok: false as const, error: "Invalid username/password." };
        const verified = await verifyPassword(password, found.passwordHash);
        if (!verified.ok) return { ok: false as const, error: "Invalid username/password." };
        if ("upgradedHash" in verified && verified.upgradedHash) {
          await db.users.update(found.id, { passwordHash: verified.upgradedHash });
          found.passwordHash = verified.upgradedHash;
        }
        if (found.status === "suspended") return { ok: false as const, error: "Account suspended." };
        localStorage.setItem(getSessionKey(), found.id);
        setUser(found);
        return { ok: true as const, user: found };
      },
      async register({ displayName, username, password, schoolCode, isMinor, kyc }) {
        await seedIfEmpty();
        const existing = await findUserByUsername(username);
        if (existing) return { ok: false as const, error: "Username already exists." };

        const passwordHash = await hashPassword(password);
        let schoolId: string | undefined = undefined;
        let linkedSchoolName: string | undefined = undefined;
        const code = schoolCode?.trim();
        if (code) {
          const school = await getSchoolByCode(code);
          if (!school) return { ok: false as const, error: "Invalid school code." };
          schoolId = school.id;
          linkedSchoolName = school.name;
        }
        const newUser: User = {
          id: newId("user"),
          role: "student",
          status: "active",
          displayName: displayName.trim(),
          username: username.trim(),
          passwordHash,
          schoolId,
          isMinor: Boolean(isMinor),
          kyc: {
            mobile: normalizeMobile(kyc.mobile),
            address: {
              country: kyc.address.country.trim(),
              region: kyc.address.region.trim(),
              street: kyc.address.street.trim()
            },
            dateOfBirth: kyc.dateOfBirth.trim(),
            gender: kyc.gender,
            studentLevel: kyc.studentLevel,
            studentLevelOther: kyc.studentLevelOther?.trim() || undefined,
            schoolName: linkedSchoolName ?? (kyc.schoolName?.trim() || undefined),
            guardianName: Boolean(isMinor) ? kyc.guardianName?.trim() || undefined : undefined,
            guardianMobile: Boolean(isMinor) ? normalizeMobile(kyc.guardianMobile ?? "") || undefined : undefined,
            updatedAt: nowIso()
          },
          createdAt: nowIso()
        };
        await db.users.add(newUser);
        await enqueueOutboxEvent({ type: "user_register", payload: { userId: newUser.id } });
        localStorage.setItem(getSessionKey(), newUser.id);
        setUser(newUser);
        return { ok: true as const };
      },
      logout() {
        localStorage.removeItem(getSessionKey());
        setUser(null);
      },
      refresh
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
