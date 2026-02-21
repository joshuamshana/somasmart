import { execSync } from 'node:child_process';

const legacyPathPattern = ['apps', 'api'].join('/');
const cmd = [
  `rg -n "${legacyPathPattern}" .`,
  "-g '!node_modules'",
  "-g '!.git'",
  `-g '!${legacyPathPattern}/**'`,
  "-g '!scripts/check-no-legacy-backend.mjs'",
  "-g '!apps/backend/.idea/**'"
].join(' ');

let output = '';
try {
  output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  const status = error && typeof error === 'object' && 'status' in error ? error.status : 1;
  if (status === 1) {
    // eslint-disable-next-line no-console
    console.log('legacy-backend-check passed (no legacy backend references outside legacy directory).');
    process.exit(0);
  }

  const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';
  // eslint-disable-next-line no-console
  console.error(`legacy-backend-check failed to run rg: ${stderr}`);
  process.exit(2);
}

// eslint-disable-next-line no-console
console.error('legacy-backend-check failed: found legacy backend references outside legacy directory');
// eslint-disable-next-line no-console
console.error(output.trim());
process.exit(1);
