import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQuantity, parseIngredient, normalizeRecipe, scaleRecipe, buildShoppingList, formatAmount, shoppingText, parseRecipeImport, getWeekStart, shiftWeek } from '../src/core.js';

const recipe = (id, ingredients, extra = {}) => normalizeRecipe({ id, title: id, servings: 2, minutes: 25, ingredients, steps: ['Bake at 180°C for 20 minutes.'], ...extra });
const plan = (recipeId, servings = 2, id = `${recipeId}-${servings}`) => ({ id, recipeId, servings, day: 'Monday', week: '2026-10-26' });
const approx = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('conflicting ids preserve corrected instructions while exact duplicates are skipped', () => {
  const first = recipe('same-id', ['100 g rice']);
  const revised = { ...first, steps: ['Rinse the rice, then cook according to the package.'] };
  const imported = parseRecipeImport(JSON.stringify({ recipes: [first, first, revised] }));
  assert.equal(imported.recipes.length, 2);
  assert.notEqual(imported.recipes[0].id, imported.recipes[1].id);
  assert.deepEqual(imported.recipes[1].steps, revised.steps);
  assert(imported.warnings.some(message => message.includes('both versions were preserved')));
});

test('fraction quantities preserve numeric meaning and reject unknowns', () => {
  assert.equal(parseQuantity('½'), 0.5);
  assert.equal(parseQuantity('1½'), 1.5);
  assert.equal(parseQuantity('2 1/3'), 2 + 1 / 3);
  assert.equal(parseQuantity('3⁄4'), 0.75);
  assert.equal(parseQuantity('0'), 0);
  assert.equal(parseQuantity('1/0'), null);
  assert.equal(parseQuantity('to taste'), null);
  assert.equal(parseQuantity(-1), null);
  assert.equal(parseQuantity('1–2'), null);
});

test('ingredient parser understands mixed fractions and package sizes', () => {
  const cup = parseIngredient('1½ cups dry rice');
  assert.equal(cup.quantity, 1.5); assert.equal(cup.unit, 'cup'); assert.equal(cup.name, 'dry rice');
  const can = parseIngredient('2 (400 g) cans chickpeas, drained');
  assert.equal(can.quantity, 2); assert.equal(can.unit, 'can'); assert.equal(can.packageSize, '400 g'); assert.equal(can.preparation, 'drained');
  const pack = parseIngredient('2 x 400 g cans tomatoes');
  assert.equal(pack.quantity, 2); assert.equal(pack.packageSize, '400 g'); assert.equal(pack.name, 'tomatoes');
  const range = parseIngredient('1–2 cloves garlic');
  assert.equal(range.quantity, null); assert.equal(range.unit, 'clove'); assert.match(range.note, /range/);
  const dimension = parseIngredient('1 1/2-inch piece ginger');
  assert.equal(dimension.quantity, null); assert.equal(dimension.name, '1 1/2-inch piece ginger'); assert.match(dimension.note, /length/);
});

test('2/4/6 serving math scales ingredients and leaves instruction numbers unchanged', () => {
  const r = recipe('rice', ['100 g rice', '1 tbsp olive oil', 'salt, to taste']);
  for (const count of [2, 4, 6]) {
    const scaled = scaleRecipe(r, count);
    assert.equal(scaled.ingredients[0].quantity, 50 * count);
    assert.equal(scaled.ingredients[1].quantity, count / 2);
    assert.equal(scaled.ingredients[2].quantity, null);
    assert.equal(scaled.minutes, 25);
    assert.equal(scaled.steps[0], 'Bake at 180°C for 20 minutes.');
  }
  assert.equal(scaleRecipe(r, 2).scalingMode, 'exact');
  assert.equal(scaleRecipe(r, 6).scalingMode, 'linear');
  assert.equal(r.ingredients[0].quantity, 100, 'source never mutated');
});

test('exact variants override linear quantities, time, and instructions', () => {
  const r = recipe('variants', ['100 g rice'], { variants: { 4: { servings: 4, ingredients: ['180 g rice'], minutes: 30, steps: ['Use a large pan for 30 minutes.'] } } });
  const result = scaleRecipe(r, 4);
  assert.equal(result.ingredients[0].quantity, 180);
  assert.equal(result.minutes, 30); assert.equal(result.steps[0], 'Use a large pan for 30 minutes.');
  assert.equal(result.scalingMode, 'exact');
  assert.throws(() => recipe('bad variant', ['1 egg'], { variants: { 4: { servings: 6, ingredients: ['6 eggs'] } } }), /conflicting servings/);
});

test('combined shopping list accounts for repeated meal occurrences', () => {
  const recipes = [recipe('pasta', ['100 g dry pasta', '1 clove garlic'])];
  const rows = buildShoppingList([plan('pasta', 2, 'first'), plan('pasta', 6, 'second')], recipes);
  assert.equal(rows.find(r => r.name === 'dry pasta').quantity, 400);
  assert.equal(rows.find(r => r.name === 'garlic').quantity, 4);
  assert.equal(rows[0].contributions.length, 2);
  assert.deepEqual(new Set(rows[0].contributions.map(c => c.entryId)), new Set(['first', 'second']));
});

test('compatible mass and explicit US volume units combine accurately', () => {
  const recipes = [recipe('one', ['0.5 kg potatoes', '1 cup olive oil']), recipe('two', ['250 g potatoes', '1 tbsp olive oil', '1 tsp olive oil'])];
  const rows = buildShoppingList(recipes.map(r => plan(r.id)), recipes);
  assert.equal(rows.find(r => r.name === 'potatoes').quantity, 750);
  approx(rows.find(r => r.name === 'olive oil').quantity, 236.5882365 + 14.78676478125 + 4.92892159375);
  assert.equal(rows.find(r => r.name === 'olive oil').unit, 'ml');
});

test('mass, volume, and different food states never silently merge', () => {
  const r = recipe('states', ['100 g rice', '1 cup rice', '1 cup rice, cooked', '1 cup rice, uncooked', '2 g dried basil', '2 g fresh basil']);
  const rows = buildShoppingList([plan(r.id)], [r]);
  assert.equal(rows.length, 6);
  assert.ok(rows.some(r => r.name === 'rice (cooked)'));
  assert.ok(rows.some(r => r.name === 'rice (uncooked)'));
  assert.match(shoppingText(rows), /rice \(cooked\)/);
  const herb = recipe('herbs', ['1 cup parsley, chopped', '1 cup parsley, whole leaves', '2 cups flour, sifted', '2 cups flour, unsifted']);
  assert.equal(buildShoppingList([plan(herb.id)], [herb]).length, 4);
});

test('package sizes isolate cans and missing sizes are flagged', () => {
  const r = recipe('cans', ['1 (400 g) can tomatoes', '2 (800 g) cans tomatoes', '1 can tomatoes']);
  const rows = buildShoppingList([plan(r.id)], [r]);
  assert.equal(rows.length, 3);
  assert.equal(rows.find(r => r.packageSize === '400 g').quantity, 1);
  assert.equal(rows.find(r => r.packageSize === '800 g').quantity, 2);
  const unknown = rows.find(r => !r.packageSize);
  assert.equal(unknown.quantity, 1); assert.equal(unknown.uncertain, true); assert.match(unknown.note, /Package size/);
});

test('unmeasured ingredients remain visible without corrupting measured totals', () => {
  const r = recipe('salt', ['2 g salt', 'salt, to taste']);
  const rows = buildShoppingList([plan(r.id, 6)], [r]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find(r => !r.uncertain).quantity, 6);
  assert.equal(rows.find(r => r.uncertain).quantity, null);
  assert.match(shoppingText(rows), /check recipe/);
});

test('native import validates partial data and reports failed records', () => {
  const valid = recipe('valid', ['2 eggs']);
  const result = parseRecipeImport(JSON.stringify({ schemaVersion: 1, recipes: [valid, { title: 'No yield', ingredients: ['1 egg'], steps: ['Cook.'] }] }));
  assert.equal(result.recipes.length, 1); assert.equal(result.recipes[0].id, 'valid');
  assert.ok(result.warnings.some(w => /servings/.test(w)));
  assert.throws(() => parseRecipeImport('not JSON'), /valid JSON/);
});

test('Schema.org imports nested graph, sections, ISO times, and reliable yield', () => {
  const schema = { '@graph': [{ '@type': ['Thing', 'Recipe'], name: 'Example &amp; meal', recipeYield: ['12', '6 servings'], totalTime: 'PT1H15M', recipeIngredient: ['1 1/2 cups dry rice', '2 eggs'], recipeInstructions: [{ '@type': 'HowToSection', name: 'Prepare', itemListElement: [{ '@type': 'HowToStep', text: 'Cook the rice.' }, { '@type': 'HowToStep', text: 'Cook the eggs.' }] }], author: { name: 'Example author' }, url: 'https://example.com/recipe' }] };
  const result = parseRecipeImport(JSON.stringify(schema));
  assert.equal(result.recipes.length, 1);
  const r = result.recipes[0];
  assert.equal(r.title, 'Example & meal'); assert.equal(r.servings, 6); assert.equal(r.minutes, 75);
  assert.equal(r.ingredients[0].quantity, 1.5); assert.equal(r.steps.length, 2); assert.equal(r.source.kind, 'imported');
  const html = `<html><script type="application/ld+json">${JSON.stringify(schema)}</script></html>`;
  assert.equal(parseRecipeImport(html, 'recipe.html').recipes.length, 1);
});

test('unknown or conflicting serving yields skip recipes with actionable warnings', () => {
  const r = { '@type': 'Recipe', name: 'Yield unknown', recipeIngredient: ['1 egg'], recipeInstructions: ['Cook.'] };
  for (const yieldValue of [undefined, '12 cookies', '4–6 servings', ['4 servings', '6 servings']]) {
    const result = parseRecipeImport(JSON.stringify({ ...r, recipeYield: yieldValue }));
    assert.equal(result.recipes.length, 0); assert.match(result.warnings[0], /serving count/);
  }
});

test('imported image and source protocols cannot inject executable URLs', () => {
  const r = recipe('bad-url', ['1 egg'], { image: 'javascript:alert(1)', source: { url: 'javascript:alert(1)' } });
  assert.equal(r.image, undefined); assert.equal(r.source.url, '');
});

test('local Monday dates and week shifts cross month and year correctly', () => {
  assert.equal(getWeekStart('2026-10-29'), '2026-10-26');
  assert.equal(getWeekStart('2026-11-01'), '2026-10-26');
  assert.equal(shiftWeek('2026-12-28', 1), '2027-01-04');
  assert.equal(shiftWeek('2026-10-26', -1), '2026-10-19');
});

test('all 12 bundled original recipes validate and produce six-serving lists', () => {
  const data = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8'));
  assert.equal(data.recipes.length, 12);
  const recipes = data.recipes.map(normalizeRecipe);
  assert.equal(new Set(recipes.map(r => r.id)).size, 12);
  for (const r of recipes) {
    assert.equal(r.source.kind, 'original'); assert.equal(r.servings, 2);
    assert.ok(r.steps.length >= 8);
    assert.equal(scaleRecipe(r, 6).ingredients.length, r.ingredients.length);
  }
  const rows = buildShoppingList(recipes.slice(0, 5).map(r => plan(r.id, 6)), recipes);
  assert.ok(rows.length > 10); assert.ok(rows.every(r => r.quantity !== null && r.quantity >= 0));
  assert.equal(formatAmount(1500, 'g'), '1½ kg');
});
