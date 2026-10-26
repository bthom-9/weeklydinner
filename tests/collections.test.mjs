import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipe, mergeRecipeCollections, buildShoppingList } from '../src/core.js';

const recipe = (id, quantity, extra = {}) => normalizeRecipe({
  id, title: id, servings: 2, ingredients: [{ name: 'dry rice', quantity, unit: 'g' }],
  steps: ['Cook the rice.'], ...extra
});

test('new bundle IDs append while saved ingredients, instructions and variants stay exact', () => {
  const saved = recipe('saved', 100, {
    steps: ['Use the saved cooking method.'],
    variants: { '4': { servings: 4, ingredients: [{ name: 'dry rice', quantity: 175, unit: 'g' }] } }
  });
  const before = structuredClone(saved);
  const replacement = recipe('saved', 800, { steps: ['A different method.'] });
  const added = recipe('new', 50);
  const merged = mergeRecipeCollections([replacement, added], [saved], []);
  assert.deepEqual(merged.bundled, [before, added]);
  assert.deepEqual(merged.addedIds, ['new']);
  assert.deepEqual(saved, before);
  const plan = [{ id: 'meal-1', recipeId: 'saved', servings: 4 }];
  assert.equal(buildShoppingList(plan, merged.recipes)[0].quantity, 175);
});

test('an import keeps its ID when a future bundle includes a conflicting recipe', () => {
  const existing = recipe('import-pack-id', 70, { steps: ['Personal saved method.'] });
  const shipped = [recipe('original', 50), recipe('import-pack-id', 500), recipe('new', 25)];
  const merged = mergeRecipeCollections(shipped, [shipped[0]], [existing]);
  assert.deepEqual(merged.addedIds, ['new']);
  assert.equal(merged.bundled.some(item => item.id === existing.id), false);
  assert.equal(merged.recipes.filter(item => item.id === existing.id).length, 1);
  assert.deepEqual(merged.recipes.find(item => item.id === existing.id), existing);
  assert.equal(buildShoppingList([{ id: 'meal', recipeId: existing.id, servings: 6 }], merged.recipes)[0].quantity, 210);
});

test('legacy states without a bundle snapshot also preserve imported IDs', () => {
  const imported = recipe('overlap', 90);
  const merged = mergeRecipeCollections([recipe('overlap', 999), recipe('new', 20)], null, [imported]);
  assert.deepEqual(merged.bundled.map(item => item.id), ['new']);
  assert.deepEqual(merged.recipes.find(item => item.id === 'overlap'), imported);
});

test('repeated updates are idempotent and never mutate input arrays', () => {
  const snapshot = [recipe('saved', 30)], imports = [recipe('personal', 40)];
  const shipped = [recipe('saved', 60), recipe('added', 20)];
  const before = structuredClone({ snapshot, imports, shipped });
  const first = mergeRecipeCollections(shipped, snapshot, imports);
  const second = mergeRecipeCollections(shipped, first.bundled, imports);
  assert.deepEqual(second.recipes, first.recipes);
  assert.deepEqual(second.addedIds, []);
  assert.deepEqual({ snapshot, imports, shipped }, before);
});

test('ambiguous duplicate IDs already present in a backup remain an explicit error', () => {
  assert.throws(() => mergeRecipeCollections([], [recipe('same', 10)], [recipe('same', 20)]), /repeats the recipe ID/);
  assert.throws(() => mergeRecipeCollections([], [], [recipe('same', 10), recipe('same', 20)]), /repeats the recipe ID/);
});
