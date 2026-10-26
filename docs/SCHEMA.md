# Weektable data contract (version 1)

`data/recipes.json` contains `{ "schemaVersion": 1, "recipes": [...] }`.
Each recipe has `id`, `title`, `description`, `servings` (positive integer),
`minutes` (number or null), `tags` (string array), `category` (string),
`ingredients` (array), `steps` (string array), and
`source: { name, url, kind: "original" | "imported", license?, licenseUrl?,
attribution?, adaptations?, retrievedAt? }`. `license`, `attribution`, and
`adaptations` are plain text, not HTML. Source and license URLs must be absolute
HTTP(S) URLs. `retrievedAt` is an optional calendar date (`YYYY-MM-DD`).
Source kind describes provenance: third-party recipes bundled with the app can
also have `kind: "imported"`. Only recipes in the user's `state.imports` collection
are personally editable or removable; provenance alone does not determine that.
Optional `image` is a local relative path or HTTPS URL; optional `color` is a CSS
hex color. An ingredient has `name`, optional `canonicalName`, `quantity`
(nonnegative number or null), `unit` (e.g. `g`, `ml`, `tsp`, `tbsp`, `cup`,
`each`, `can`, `clove`), `category`, optional `preparation`, `packageSize`
(string, such as `400 g`), `note`, and `raw`. A null quantity means an unmeasured
ingredient, and must be visibly flagged, never silently treated as zero.

Optional `rating` records the original source recipe's public reader rating:

```json
{
  "value": 4.7,
  "count": 125,
  "best": 5,
  "retrievedAt": "2026-10-26",
  "sourceUrl": "https://example.com/the-original-recipe"
}
```

This example demonstrates the format, not a real rating. `value` must be finite,
positive, and no greater than `best` (defaults to 5). `count` must be a positive
safe integer. `sourceUrl` must be a valid HTTP(S) URL; if omitted, the recipe's
source URL is used. `retrievedAt`, when known, must be a real `YYYY-MM-DD` date.
Invalid optional ratings are omitted instead of displaying an invented score.
Original starter recipes carry no reader ratings unless externally substantiated.
Ratings survive native JSON import/export, backup restoration, and serving
scaling. Schema.org imports preserve `aggregateRating.ratingValue`, `ratingCount`
(or `reviewCount`), and `bestRating`; they do not invent a retrieval date.

The UI explicitly labels ratings as belonging to the original source recipe.
The **Reader favourites** filter requires a score of at least 80% of the source
scale (4/5) and at least 10 ratings. Local recipe edits preserve original rating
provenance and add an adaptation note when ingredients, servings, or steps change.

Optional `variants` maps the strings `2`, `4`, or `6` to
`{ servings, ingredients, steps?, minutes? }`. An exact serving variant takes
precedence over linear scaling. Cooking times and numeric text inside steps are
never multiplied automatically. The cook screen must show the selected serving
count and whether quantities are an exact source variant or linearly scaled.

Plan entries are `{ id, recipeId, servings: 2|4|6, day: "Monday", week: "YYYY-MM-DD" }`.
An entry is one meal occurrence; repeating a recipe counts its ingredients again.

Core module `src/core.js` exports:

- `normalizeRecipe(input)` → validated normalized recipe or throws actionable Error.
- `mergeRecipeCollections(shipped, savedBundled?, imports?)` →
  `{ bundled, recipes, addedIds }`. Preserves saved bundled records and personal
  imports exactly, appends only missing shipped IDs, and rejects duplicate IDs
  already present inside a backup. A later bundled version never takes the ID
  away from an existing import. Inputs are not mutated.
- `parseIngredient(text)` → structured ingredient with raw input and explicit unknowns.
- `parseQuantity(text)` → number or null; fraction and mixed-fraction support.
- `scaleRecipe(recipe, servings)` → recipe-like copy with ingredients, steps, minutes,
  `servings`, `baseServings`, `scaleFactor`, `scalingMode: "exact"|"linear"`.
- `buildShoppingList(plan, recipes)` → array of rows
  `{ id, name, quantity, unit, category, packageSize?, note?, uncertain,
     contributions: [{ entryId, recipeId, recipeTitle, quantity, unit, servings }] }`.
  Rows merge only compatible physical units, same ingredient identity and same
  package size. No assumed ingredient densities or raw/cooked substitutions.
- `formatQuantity(number)` → readable string.
- `formatAmount(quantity, unit, options?)` → readable amount (no ingredient name).
- `shoppingText(rows)` → grocery-list plain text.
- `parseRecipeImport(text, fileName?)` → `{ recipes, warnings }`; accepts native
  JSON, Schema.org Recipe JSON-LD, and saved HTML with embedded Recipe JSON-LD.
- `getWeekStart(date?)` → local Monday ISO date.
- `shiftWeek(week, delta)` → shift by whole weeks.

The UI stores device data in IndexedDB (with a small localStorage fallback) and
must preserve plans and imports in a versioned backup. Import warnings and failed
recipes are reported; duplicate ids use a
deliberate merge strategy. Original bundled recipes must be clearly identified
as starter recipes and must not be attributed to Mealime.

Restored recipe snapshots retain their saved ingredient amounts and serving
variants across app updates. Newly shipped recipe IDs are appended automatically
on load or restore, without replacing an existing saved recipe or personal
import. These appended records are included in subsequent full backups.
