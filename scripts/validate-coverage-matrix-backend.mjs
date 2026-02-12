import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "coverage-matrix-backend.md");
const requirementsMapPath = path.join(root, "e2e", "requirements-map-backend.json");

function fail(message) {
  console.error(`\n[coverage-matrix-backend] ${message}`);
  process.exit(1);
}

function parseRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^\| BREQ-\d+/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      return {
        requirementId: cells[1],
        implementationCell: cells[2] ?? "",
        testsCell: cells[3] ?? "",
        status: cells[4] ?? ""
      };
    });
}

function extractBacktickRefs(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
}

function fileExists(projectRelativePath) {
  return fs.existsSync(path.join(root, projectRelativePath));
}

function isAutomatedTestRef(ref) {
  return /\.(test|spec)\.[tj]sx?$/.test(ref);
}

if (!fileExists("docs/coverage-matrix-backend.md")) {
  fail(`missing file: ${matrixPath}`);
}

const matrixText = fs.readFileSync(matrixPath, "utf8");
const rows = parseRows(matrixText);
if (!rows.length) {
  fail("no backend requirement rows were parsed from docs/coverage-matrix-backend.md");
}

const validStatuses = new Set(["done", "partial", "planned"]);
const expectedReqToTests = {};
const problems = [];

for (const row of rows) {
  if (!validStatuses.has(row.status)) {
    problems.push(`${row.requirementId}: invalid status '${row.status || "empty"}'`);
  }

  const implementationRefs = extractBacktickRefs(row.implementationCell);
  const testsRefs = extractBacktickRefs(row.testsCell);
  const allRefs = [...implementationRefs, ...testsRefs];

  for (const ref of allRefs) {
    if (ref.includes("/") && !fileExists(ref)) {
      problems.push(`${row.requirementId}: referenced file does not exist: ${ref}`);
    }
  }

  const automatedTestRefs = [...new Set(testsRefs.filter(isAutomatedTestRef))].sort();

  if (row.status === "done" && automatedTestRefs.length === 0) {
    problems.push(`${row.requirementId}: done status requires at least one automated test reference`);
  }

  expectedReqToTests[row.requirementId] = automatedTestRefs;
}

if (problems.length > 0) {
  fail(`matrix validation failed:\n- ${problems.join("\n- ")}`);
}

if (!fileExists("e2e/requirements-map-backend.json")) {
  fail("missing e2e/requirements-map-backend.json. Run: node scripts/sync-requirements-map-backend.mjs");
}

const actualReqToTests = JSON.parse(fs.readFileSync(requirementsMapPath, "utf8"));
const expectedText = JSON.stringify(expectedReqToTests, null, 2);
const actualText = JSON.stringify(actualReqToTests, null, 2);
if (expectedText !== actualText) {
  fail(
    "e2e/requirements-map-backend.json is out of sync with docs/coverage-matrix-backend.md. Run: node scripts/sync-requirements-map-backend.mjs"
  );
}

const apiTestRun = spawnSync("npm", ["run", "api:test"], {
  cwd: root,
  encoding: "utf8"
});
if (apiTestRun.status !== 0) {
  fail(`npm run api:test failed:\n${apiTestRun.stdout}\n${apiTestRun.stderr}`);
}

console.log(`[coverage-matrix-backend] OK: ${rows.length} requirements validated and backend tests are green.`);
