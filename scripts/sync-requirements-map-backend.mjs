import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "coverage-matrix-backend.md");
const outputPath = path.join(root, "e2e", "requirements-map-backend.json");

function parseRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => /^\| BREQ-\d+/.test(line))
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

function isAutomatedTestRef(ref) {
  return /\.(test|spec)\.[tj]sx?$/.test(ref);
}

const matrixText = fs.readFileSync(matrixPath, "utf8");
const rows = parseRows(matrixText);

const output = {};
for (const row of rows) {
  const refs = extractBacktickRefs(row.testsCell).filter(isAutomatedTestRef);
  output[row.requirementId] = [...new Set(refs)].sort();
}

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
