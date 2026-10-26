import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRecipe, scaleRecipe, buildShoppingList } from '../src/core.js';

const raw = JSON.parse(readFileSync(new URL('../data/recipes.json', import.meta.url), 'utf8')).recipes;
const recipes = raw.map(normalizeRecipe);
const additions = recipes.filter(recipe => recipe.source.kind === 'imported');
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test('the 40-recipe bundle contains 28 rated, attributable additions with unique IDs', () => {
  assert.equal(recipes.length, 40);
  assert.equal(new Set(raw.map(recipe => recipe.id)).size, 40);
  assert.equal(additions.length, 28);
  const publishers = new Map([
    ['Striped Spatula', 'stripedspatula.com'],
    ['Just One Cookbook', 'www.justonecookbook.com']
  ]);
  for (const recipe of additions) {
    const input = raw.find(item => item.id === recipe.id);
    const source = new URL(recipe.source.url);
    assert.equal(source.protocol, 'https:', recipe.id);
    assert.equal(source.hostname, publishers.get(recipe.source.name), recipe.id);
    assert.notEqual(source.pathname, '/', recipe.id);
    assert.equal(new URL(recipe.source.licenseUrl).hostname, source.hostname, recipe.id);
    assert.ok(recipe.source.attribution?.trim(), recipe.id);
    assert.ok(recipe.source.license?.trim(), recipe.id);
    assert.ok(recipe.source.adaptations?.trim(), recipe.id);
    assert.deepEqual(recipe.source, input.source, `${recipe.id}: provenance survives normalization`);
    assert.deepEqual(recipe.rating, input.rating, `${recipe.id}: rating survives normalization`);
    assert.equal(recipe.rating.best, 5, recipe.id);
    assert.ok(recipe.rating.value >= 4.5 && recipe.rating.value <= 5, recipe.id);
    assert.ok(Number.isSafeInteger(recipe.rating.count) && recipe.rating.count >= 10, recipe.id);
    assert.equal(recipe.rating.sourceUrl, recipe.source.url, recipe.id);
    assert.equal(recipe.rating.retrievedAt, '2026-10-26', recipe.id);
  }
});

test('all 28 additions retain valid quantities, instructions and attribution at 2/4/6 servings', () => {
  assert.equal(additions.length, 28);
  for (const recipe of additions) {
    const input = raw.find(item => item.id === recipe.id);
    for (const ingredient of input.ingredients) {
      assert.ok(ingredient.quantity === null || Number.isFinite(ingredient.quantity) && ingredient.quantity > 0,
        `${recipe.id}: invalid source amount for ${ingredient.name}`);
    }
    for (const servings of [2, 4, 6]) {
      const scaled = scaleRecipe(recipe, servings);
      assert.equal(scaled.servings, servings);
      assert.equal(scaled.ingredients.length, input.ingredients.length, recipe.id);
      scaled.ingredients.forEach((ingredient, index) => {
        assert.equal(ingredient.quantity === null, input.ingredients[index].quantity === null, recipe.id);
        assert.ok(ingredient.quantity === null || Number.isFinite(ingredient.quantity) && ingredient.quantity > 0,
          `${recipe.id}, ${servings} servings: ${ingredient.name}`);
      });
      assert.deepEqual(scaled.steps, recipe.steps, `${recipe.id}: times and temperatures must not scale`);
      assert.deepEqual(scaled.source, recipe.source, recipe.id);
      assert.deepEqual(scaled.rating, recipe.rating, recipe.id);
    }
  }
});

const week = [
  ['joc-oyakodon', 4], ['joc-soy-glazed-eggplant-donburi', 2], ['joc-miso-salmon', 6],
  ['sp-beef-and-broccoli', 2], ['sesame-tofu-bowls', 2]
].map(([recipeId, servings], index) => ({ id: `meal-${index + 1}`, recipeId, servings }));
const weeklyRows = () => {
  for (const meal of week) assert.ok(recipes.some(recipe => recipe.id === meal.recipeId), `Missing ${meal.recipeId}`);
  return buildShoppingList(week, recipes);
};
const oneRow = (rows, name, unit) => {
  const matches = rows.filter(row => row.name === name && row.unit === unit);
  assert.equal(matches.length, 1, `Expected one ${name} row in ${unit}`);
  return matches[0];
};

test('a five-meal week adds manually checked source quantities across serving sizes', () => {
  const rows = weeklyRows();
  // Soy: 4 + 2 + 3 US tbsp plus 30 ml; mirin: 4 + 4 + 3 tbsp; sake: 2 + 3 tbsp.
  const soy = oneRow(rows, 'soy sauce', 'ml');
  near(soy.quantity, 163.08088303125);
  near(oneRow(rows, 'mirin', 'ml').quantity, 162.65441259375);
  near(oneRow(rows, 'sake', 'ml').quantity, 73.93382390625);
  assert.deepEqual(new Set(soy.contributions.map(item => item.entryId)), new Set(['meal-1', 'meal-2', 'meal-3', 'meal-5']));
  // The beef recipe's light soy is a separate condiment: 1.5 US tbsp for two people.
  near(oneRow(rows, 'light soy sauce', 'ml').quantity, 22.180147171875);
  // Rice is explicitly cooked: 1,000 g for Oyakodon plus 500 g for eggplant donburi.
  assert.equal(oneRow(rows, 'cooked Japanese short-grain rice', 'g').quantity, 1500);
  assert.equal(oneRow(rows, 'salmon fillets (skin on, under 2.5 cm thick)', 'g').quantity, 1020);
});

test('the same week keeps dry rice, incompatible measures and unknown amounts separate', () => {
  const rows = weeklyRows();
  assert.equal(oneRow(rows, 'dry long-grain rice', 'g').quantity, 150);
  assert.equal(rows.filter(row => /rice$/.test(row.name)).length, 2);
  // Tofu needs 15 g cornstarch; eggplant and beef need 2 tbsp + 2.5 tsp. No density guess.
  assert.equal(oneRow(rows, 'cornstarch', 'g').quantity, 15);
  near(oneRow(rows, 'cornstarch', 'ml').quantity, 41.895833546875);
  assert.equal(rows.filter(row => row.name === 'cornstarch').length, 2);
  // Beef has 1.25 tbsp measured oil; miso salmon has additional unmeasured oil.
  near(oneRow(rows, 'vegetable oil', 'ml').quantity, 18.4834559765625);
  const unknownOil = oneRow(rows, 'vegetable oil', 'each');
  assert.equal(unknownOil.quantity, null);
  assert.equal(unknownOil.uncertain, true);
  assert.deepEqual(unknownOil.contributions.map(item => item.recipeId), ['joc-miso-salmon']);
});
