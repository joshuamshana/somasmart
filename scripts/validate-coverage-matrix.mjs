import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "coverage-matrix.md");
const requirementsMapPath = path.join(root, "e2e", "requirements-map.json");

function fail(message) {
  console.error(`\n[coverage-matrix] ${message}`);
  process.exit(1);
}

function parseRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^\| REQ-\d+/.test(line))
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

function expandTestRef(ref) {
  if (ref.startsWith("e2e/") && ref.includes("*")) {
    const e2eDir = path.join(root, "e2e");
    if (!fs.existsSync(e2eDir)) return [];
    return fs
      .readdirSync(e2eDir)
      .filter((name) => name.endsWith(".spec.ts"))
      .map((name) => `e2e/${name}`);
  }
  return [ref];
}

function fileExists(projectRelativePath) {
  return fs.existsSync(path.join(root, projectRelativePath));
}

function runPlaywrightList() {
  const res = spawnSync("npm", ["run", "test:e2e", "--", "--list"], {
    cwd: root,
    encoding: "utf8"
  });
  if (res.status !== 0) {
    fail(`playwright --list failed:\n${res.stdout}\n${res.stderr}`);
  }
  const listed = new Set();
  const regex = /›\s+([^\s:]+\.spec\.ts):\d+:\d+/g;
  let match = regex.exec(res.stdout);
  while (match) {
    listed.add(`e2e/${match[1]}`);
    match = regex.exec(res.stdout);
  }
  return listed;
}

if (!fileExists("docs/coverage-matrix.md")) {
  fail(`missing file: ${matrixPath}`);
}

const matrixText = fs.readFileSync(matrixPath, "utf8");
const rows = parseRows(matrixText);
if (!rows.length) fail("no requirement rows were parsed from docs/coverage-matrix.md");

const allExpectedE2e = new Set();
const expectedReqToE2e = {};
const problems = [];

for (const row of rows) {
  if (row.status !== "done") {
    problems.push(`${row.requirementId}: status must be 'done' (found '${row.status || "empty"}')`);
  }

  const refs = extractBacktickRefs(row.testsCell).flatMap(expandTestRef);
  const e2eRefs = refs.filter((ref) => ref.startsWith("e2e/"));

  if (e2eRefs.length === 0) {
    problems.push(`${row.requirementId}: tests column must reference at least one e2e spec file`);
  }

  for (const ref of refs) {
    if (ref.startsWith("src/") || ref.startsWith("e2e/")) {
      if (!fileExists(ref)) problems.push(`${row.requirementId}: referenced file does not exist: ${ref}`);
    }
  }

  const uniqueE2eRefs = [...new Set(e2eRefs)].sort();
  expectedReqToE2e[row.requirementId] = uniqueE2eRefs;
  for (const ref of uniqueE2eRefs) allExpectedE2e.add(ref);
}

if (problems.length > 0) {
  fail(`matrix validation failed:\n- ${problems.join("\n- ")}`);
}

if (!fileExists("e2e/requirements-map.json")) {
  fail("missing e2e/requirements-map.json. Run: node scripts/sync-e2e-requirements-map.mjs");
}

const actualReqToE2e = JSON.parse(fs.readFileSync(requirementsMapPath, "utf8"));
const expectedText = JSON.stringify(expectedReqToE2e, null, 2);
const actualText = JSON.stringify(actualReqToE2e, null, 2);
if (expectedText !== actualText) {
  fail("e2e/requirements-map.json is out of sync with docs/coverage-matrix.md. Run: node scripts/sync-e2e-requirements-map.mjs");
}

const listedE2eFiles = runPlaywrightList();
const missingFromPlaywright = [...allExpectedE2e].filter((file) => !listedE2eFiles.has(file));
if (missingFromPlaywright.length > 0) {
  fail(`matrix references e2e files that are not runnable via Playwright:\n- ${missingFromPlaywright.join("\n- ")}`);
}

console.log(
  `[coverage-matrix] OK: ${rows.length} requirements validated, ${allExpectedE2e.size} e2e specs mapped and listed by Playwright.`
);
