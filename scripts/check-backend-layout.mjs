import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = '/Users/joshuamshana/Documents/SomaSmart';
const functionsDir = path.join(repoRoot, 'apps/backend/functions');
const coreDir = path.join(repoRoot, 'apps/backend/core');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      out.push(...walk(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(`layout-check failed: ${message}`);
  process.exit(1);
}

if (!existsSync(functionsDir)) {
  fail('missing apps/backend/functions directory');
}
if (!existsSync(coreDir)) {
  fail('missing apps/backend/core directory');
}

const functionFiles = walk(functionsDir).filter((file) => file.endsWith('.mjs'));
if (functionFiles.length === 0) {
  fail('no .mjs runtime files found in apps/backend/functions');
}

const forbiddenImportFragments = [
  "from '../core/data/",
  "from '../core/contracts",
  "from '../core/lib/crypto",
  'from "@prisma/client"',
  'from "prisma"',
  'from "jose"'
];

const forbiddenImplementationPatterns = [
  'new PrismaClient(',
  'pbkdf2Sync(',
  'SignJWT(',
  'jwtVerify(',
  'z.object('
];

for (const file of functionFiles) {
  const code = readFileSync(file, 'utf8');

  if (!/onRequest\s*:|onGuard\s*:|onEvent\s*:|onJob\s*:/.test(code)) {
    fail(`runtime file does not export a supported serverless contract: ${path.relative(repoRoot, file)}`);
  }

  for (const fragment of forbiddenImportFragments) {
    if (code.includes(fragment)) {
      fail(`forbidden direct import in functions layer: ${path.relative(repoRoot, file)} -> ${fragment}`);
    }
  }

  for (const fragment of forbiddenImplementationPatterns) {
    if (code.includes(fragment)) {
      fail(`forbidden implementation pattern in functions layer: ${path.relative(repoRoot, file)} -> ${fragment}`);
    }
  }
}

// eslint-disable-next-line no-console
console.log(`layout-check passed (${functionFiles.length} function files).`);
