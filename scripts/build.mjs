import { mkdir, readFile, readdir, rm, copyFile, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { normalizeRecipe } from '../src/core.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const sourceDirs = ['src', 'data', 'assets'];
const rootFiles = ['index.html', 'manifest.webmanifest', 'sw.js', '.nojekyll'];
const files = [...rootFiles];
async function walk(path) {
  for (const entry of await readdir(resolve(root, path), { withFileTypes: true })) {
    const item = `${path}/${entry.name}`;
    if (entry.isDirectory()) await walk(item);
    else if (entry.isFile()) files.push(item);
  }
}
for (const dir of sourceDirs) await walk(dir);
const data = JSON.parse(await readFile(resolve(root, 'data/recipes.json'), 'utf8'));
if (data.schemaVersion !== 1 || !Array.isArray(data.recipes) || !data.recipes.length) {
  throw new Error('data/recipes.json must contain a version-1 recipes array.');
}
const ids = new Set();
for (const raw of data.recipes) {
  const recipe = normalizeRecipe(raw);
  if (ids.has(recipe.id)) throw new Error(`Duplicate bundled recipe id: ${recipe.id}`);
  ids.add(recipe.id);
  if (!recipe.ingredients.length || !recipe.steps.length) throw new Error(`Incomplete recipe: ${recipe.id}`);
}
const hash = createHash('sha256');
for (const file of [...files].sort()) { hash.update(file); hash.update(await readFile(resolve(root, file))); }
const buildId = hash.digest('hex').slice(0, 16);
if (relative(root, output).split(sep).includes('..') || output === root) throw new Error('Unsafe output path');
await mkdir(output, { recursive: true });
// Keep the directory itself stable for a preview server whose cwd is dist/.
for (const entry of await readdir(output)) await rm(resolve(output, entry), { recursive: true, force: true });
for (const file of files) {
  const target = resolve(output, file);
  await mkdir(dirname(target), { recursive: true });
  if (file === 'sw.js') {
    const source = await readFile(resolve(root, file), 'utf8');
    await writeFile(target, source.replaceAll('__BUILD_ID__', buildId));
  } else await copyFile(resolve(root, file), target);
}
const assets = files.filter(file => file.startsWith('assets/')).map(file => `./${file}`);
await writeFile(resolve(output, 'offline-assets.json'), JSON.stringify({ version: buildId, assets }, null, 2));
let size = 0;
for (const file of files) size += (await stat(resolve(output, file))).size;
console.log(`Built ${files.length + 1} files; ${data.recipes.length} original starter recipes; ${Math.round(size / 1024)} KiB; version ${buildId}`);
