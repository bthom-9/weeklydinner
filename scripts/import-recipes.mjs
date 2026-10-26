#!/usr/bin/env node
/** Combine local recipe JSON / JSON-LD / saved HTML into a Weektable import.
 * This utility performs no network requests and does not scrape websites.
 */
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, basename, dirname } from 'node:path';
import { parseRecipeImport } from '../src/core.js';

const args = process.argv.slice(2);
const flag = args.indexOf('--output');
const outputArg = flag >= 0 ? args[flag + 1] : null;
if (flag >= 0 && !outputArg) { console.error('Missing path after --output'); process.exit(1); }
const inputs = args.filter((_, index) => flag < 0 || (index !== flag && index !== flag + 1));
if (!inputs.length || inputs.includes('--help')) {
  console.log('Usage: node scripts/import-recipes.mjs <file-or-directory> [...] --output imports/my-recipes.json');
  console.log('Accepts local .json, .jsonld, .html and .htm files. No website downloads.');
  console.log('Afterward open Weektable > Settings > Import and select the output JSON file.');
  process.exit(inputs.includes('--help') ? 0 : 1);
}
const output = resolve(outputArg || 'imports/my-recipes.json');
const files = [];
async function collect(path) {
  const info = await stat(path);
  if (info.isDirectory()) {
    for (const item of await readdir(path, { withFileTypes: true })) {
      if (item.name.startsWith('.')) continue;
      // Avoid following symlinks into unrelated directories.
      if (item.isDirectory() || item.isFile()) await collect(resolve(path, item.name));
    }
  } else if (info.isFile() && ['.json', '.jsonld', '.html', '.htm'].includes(extname(path).toLowerCase()) && path !== output) files.push(path);
}
for (const input of inputs) await collect(resolve(input));
const recipes = new Map();
const report = { created: new Date().toISOString(), scannedFiles: files.length, importedRecipes: 0, warnings: [], failedFiles: [] };
for (const file of [...new Set(files)].sort()) {
  try {
    if ((await stat(file)).size > 30 * 1024 * 1024) throw new Error('File exceeds the 30 MiB per-file limit.');
    const result = parseRecipeImport(await readFile(file, 'utf8'), basename(file));
    for (const warning of result.warnings || []) report.warnings.push({ file: basename(file), warning });
    for (const recipe of result.recipes) {
      if (recipes.has(recipe.id)) {
        const previous = recipes.get(recipe.id);
        if (JSON.stringify(previous) === JSON.stringify(recipe)) continue;
        // Preserve distinct records instead of silently overwriting a recipe.
        const baseId = recipe.id;
        let count = 2;
        while (recipes.has(`${baseId}-${count}`)) count++;
        recipe.id = `${baseId}-${count}`;
        report.warnings.push({ file: basename(file), warning: `Duplicate id ${baseId}; kept both recipes as ${recipe.id}.` });
      }
      recipes.set(recipe.id, recipe);
    }
  } catch (error) { report.failedFiles.push({ file: basename(file), error: error.message }); }
}
report.importedRecipes = recipes.size;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ schemaVersion: 1, recipes: [...recipes.values()] }, null, 2) + '\n');
await writeFile(`${output}.report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`Imported ${recipes.size} recipes from ${report.scannedFiles} files.`);
console.log(`Output: ${output}`);
console.log(`Warnings: ${report.warnings.length}; failed files: ${report.failedFiles.length}. See ${output}.report.json`);
if (!recipes.size) process.exitCode = 2;
