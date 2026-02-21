import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = resolve(import.meta.dirname, "..");
const migrationsDir = resolve(rootDir, "prisma", "migrations");

function runPrisma(args) {
  const result = spawnSync("npx", ["prisma", ...args], {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasMigrationFiles() {
  if (!existsSync(migrationsDir)) return false;
  return readdirSync(migrationsDir, { withFileTypes: true }).some((entry) => entry.isDirectory());
}

runPrisma(["migrate", "deploy"]);

if (!hasMigrationFiles()) {
  console.log("No local Prisma migrations found; applying schema with `prisma db push` for bootstrap.");
  runPrisma(["db", "push", "--skip-generate"]);
}
