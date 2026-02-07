import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "coverage-matrix.md");
const outputPath = path.join(root, "e2e", "requirements-map.json");

function parseRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^\| REQ-\d+/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      return {
        requirementId: cells[1],
        testsCell: cells[3] ?? ""
      };
    });
}

function extractBacktickRefs(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
}

function expandE2eRef(ref) {
  if (!ref.startsWith("e2e/")) return [];
  if (!ref.includes("*")) return [ref];
  const dir = path.join(root, "e2e");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => `e2e/${name}`);
}

const matrixText = fs.readFileSync(matrixPath, "utf8");
const rows = parseRows(matrixText);
const out = {};

for (const row of rows) {
  const refs = extractBacktickRefs(row.testsCell);
  const e2eFiles = refs.flatMap(expandE2eRef);
  out[row.requirementId] = [...new Set(e2eFiles)].sort();
}

fs.writeFileSync(outputPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
