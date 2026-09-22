// Build the actual client with a local API proxy and without SSR/prerender.
// Restore both configuration files even if the compiler fails.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const angularPath = 'angular.json';
const environmentPath = 'src/environments/environment.ts';
const angularOriginal = readFileSync(angularPath);
const environmentOriginal = readFileSync(environmentPath);
try {
  const angular = JSON.parse(angularOriginal);
  const options = angular.projects.app.architect.build.options;
  delete options.server; delete options.ssr; delete options.prerender;
  writeFileSync(angularPath, JSON.stringify(angular, null, 2));
  writeFileSync(environmentPath, environmentOriginal.toString().replace(
    'https://stellaruisecretapiappprod.azurewebsites.net/api/', '/api/'));
  const result = spawnSync(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', '--configuration', 'development',
    '--output-path', '/tmp/stellar-secret-browser-build'], { stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });
  process.exitCode = result.status ?? 1;
} finally {
  writeFileSync(angularPath, angularOriginal);
  writeFileSync(environmentPath, environmentOriginal);
}
