import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecipe, parseRecipeImport, scaleRecipe } from '../src/core.js';

// Synthetic fixtures: these scores do not describe any published recipe.
const recipe = extra => ({
  id: 'rating-fixture', title: 'Metadata test', servings: 2,
  ingredients: ['100 g dry rice'], steps: ['Cook according to the rice packet.'],
  source: { name: 'Test source', url: 'https://example.com/recipe', kind: 'imported' },
  ...extra
});
const rating = { value: 4.7, count: 125, best: 5, retrievedAt: '2026-10-26', sourceUrl: 'https://example.com/recipe' };

test('normalization and import/export retain rating and reuse provenance', () => {
  const input = recipe({ rating, source: {
    name: 'Test source', url: 'https://example.com/recipe', kind: 'imported',
    license: 'Fixture license', licenseUrl: 'https://example.com/license',
    attribution: 'Fixture author', adaptations: 'Ingredient units normalized.', retrievedAt: '2026-10-26'
  } });
  const normalized = normalizeRecipe(input);
  assert.deepEqual(normalized.rating, rating);
  assert.deepEqual(normalized.source, input.source);
  const restored = parseRecipeImport(JSON.stringify({ schemaVersion: 1, recipes: [normalized] })).recipes[0];
  assert.deepEqual(restored, normalized);
});

test('serving changes scale food but preserve original source scores and vote counts', () => {
  const original = normalizeRecipe(recipe({ rating }));
  for (const servings of [2, 4, 6]) {
    const scaled = scaleRecipe(original, servings);
    assert.deepEqual(scaled.rating, rating);
    assert.equal(scaled.ingredients[0].quantity, 50 * servings);
  }
});

test('invalid, unrated and unattributable scores never produce a rating badge', () => {
  for (const bad of [
    { ...rating, value: 6 }, { ...rating, value: 0 }, { ...rating, value: true },
    { ...rating, value: NaN }, { ...rating, count: 0 }, { ...rating, count: -1 },
    { ...rating, count: 2.5 }, { ...rating, count: Number.MAX_SAFE_INTEGER + 1 },
    { ...rating, count: true }, { ...rating, best: 0 }, { ...rating, best: Infinity }
  ]) assert.equal(normalizeRecipe(recipe({ rating: bad })).rating, undefined);
  assert.equal(normalizeRecipe(recipe()).rating, undefined);
  assert.equal(normalizeRecipe(recipe({ source: {}, rating: { value: 5, count: 1, sourceUrl: 'javascript:alert(1)' } })).rating, undefined);
  assert.equal(normalizeRecipe(recipe({ source: {}, rating: { value: 5, count: 1, sourceUrl: 'https://' } })).rating, undefined);
});

test('unsafe links and impossible dates are dropped without damaging recipe content', () => {
  const normalized = normalizeRecipe(recipe({
    rating: { ...rating, retrievedAt: '2026-02-30', sourceUrl: 'javascript:alert(1)' },
    source: { name: 'Test source', url: 'https://example.com/recipe', kind: 'imported', licenseUrl: 'data:text/html,<script>bad</script>', retrievedAt: '2026-13-01' }
  }));
  assert.equal(normalized.rating.sourceUrl, 'https://example.com/recipe');
  assert.equal(normalized.rating.retrievedAt, undefined);
  assert.equal(normalized.source.licenseUrl, undefined);
  assert.equal(normalized.source.retrievedAt, undefined);
  assert.equal(normalized.ingredients[0].quantity, 100);
  assert.equal(normalizeRecipe(recipe({ rating: { ...rating, retrievedAt: '2024-02-29' } })).rating.retrievedAt, '2024-02-29');
});

test('Schema.org import retains score, count, scale and supplied license', () => {
  const schema = {
    '@context': 'https://schema.org', '@type': 'Recipe', name: 'Schema fixture', recipeYield: '2 servings',
    recipeIngredient: ['100 g dry rice'], recipeInstructions: ['Cook the rice.'],
    author: { name: 'Fixture cook' }, url: 'https://example.com/recipe', license: 'https://example.com/license', creditText: 'Fixture cook and publisher',
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '9.4', bestRating: '10', ratingCount: '250' }
  };
  const imported = parseRecipeImport(JSON.stringify(schema)).recipes[0];
  assert.deepEqual(imported.rating, { value: 9.4, count: 250, best: 10, sourceUrl: 'https://example.com/recipe' });
  assert.equal(imported.source.licenseUrl, 'https://example.com/license');
  assert.equal(imported.source.attribution, 'Fixture cook and publisher');
  assert.equal(imported.rating.retrievedAt, undefined);
});

test('Schema.org reviewCount fallback does not manufacture votes for an unrated recipe', () => {
  const schema = {
    '@type': 'Recipe', name: 'Fallback fixture', recipeYield: 2,
    recipeIngredient: ['100 g rice'], recipeInstructions: ['Cook rice.'], url: 'https://example.com/recipe',
    aggregateRating: { ratingValue: '4.2', reviewCount: '32' }
  };
  assert.equal(parseRecipeImport(JSON.stringify(schema)).recipes[0].rating.count, 32);
  delete schema.aggregateRating.reviewCount;
  assert.equal(parseRecipeImport(JSON.stringify(schema)).recipes[0].rating, undefined);
});
