# Weektable data contract (version 1)

`data/recipes.json` contains `{ "schemaVersion": 1, "recipes": [...] }`.
Each recipe has `id`, `title`, `description`, `servings` (positive integer),
`minutes` (number or null), `tags` (string array), `category` (string),
`ingredients` (array), `steps` (string array), and
`source: { name, url, kind: "original" | "imported", license? }`.
Optional `image` is a local relative path or HTTPS URL; optional `color` is a CSS
hex color. An ingredient has `name`, optional `canonicalName`, `quantity`
(nonnegative number or null), `unit` (e.g. `g`, `ml`, `tsp`, `tbsp`, `cup`,
`each`, `can`, `clove`), `category`, optional `preparation`, `packageSize`
(string, such as `400 g`), `note`, and `raw`. A null quantity means an unmeasured
ingredient, and must be visibly flagged, never silently treated as zero.

Optional `variants` maps the strings `2`, `4`, or `6` to
`{ servings, ingredients, steps?, minutes? }`. An exact serving variant takes
precedence over linear scaling. Cooking times and numeric text inside steps are
never multiplied automatically. The cook screen must show the selected serving
count and whether quantities are an exact source variant or linearly scaled.

Plan entries are `{ id, recipeId, servings: 2|4|6, day: "Monday", week: "YYYY-MM-DD" }`.
An entry is one meal occurrence; repeating a recipe counts its ingredients again.

Core module `src/core.js` exports:

- `normalizeRecipe(input)` → validated normalized recipe or throws actionable Error.
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

The UI owns `localStorage` state and must preserve plans and imports in a versioned
backup. Import warnings and failed recipes are reported; duplicate ids use a
deliberate merge strategy. Original bundled recipes must be clearly identified
as starter recipes and must not be attributed to Mealime.
