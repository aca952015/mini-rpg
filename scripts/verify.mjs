import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? walk(path) : /\.(js|mjs)$/.test(entry.name) ? [path] : [];
});
const sources = walk('src');
const scripts = [...sources, ...walk('scripts'), ...walk('tests'), resolve('game.js'), resolve('web.js')];
let failures = 0;
for (const path of scripts) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); failures++; }
  const source = readFileSync(path, 'utf8');
  for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)) {
    if (!existsSync(resolve(dirname(path), specifier))) {
      console.error(`Missing import: ${relative(root, path)} -> ${specifier}`); failures++;
    }
  }
}
// Keep reusable modules independent of game content and old project imports.
for (const path of sources) {
  const name = relative(root, path).replaceAll('\\', '/');
  if (!/^src\/(engine|platform|core|rendering)\//.test(name)) continue;
  const source = readFileSync(path, 'utf8');
  for (const [, specifier] of source.matchAll(/from\s*['"]([^'"]+)['"]/g)) {
    const target = relative(root, resolve(dirname(path), specifier)).replaceAll('\\', '/');
    if (!/^src\/(engine|platform|core|rendering)\//.test(target)) {
      console.error(`Infrastructure depends on application code: ${name} -> ${specifier}`);
      failures++;
    }
  }
}
for (const file of ['game.json', 'project.config.json', 'package.json']) JSON.parse(readFileSync(file, 'utf8'));
for (const args of [['--test', ...walk('tests')]]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) failures++;
}
const diff = spawnSync('git', ['diff', '--check'], { stdio: 'inherit' });
if (diff.status !== 0) failures++;
console.log(`${sources.length} source modules checked; ${failures} failed checks.`);
process.exitCode = failures ? 1 : 0;
