/** Weektable recipe math. Pure functions; no network, storage, or dependencies. */

const VULGAR = { '¼': '1/4', '½': '1/2', '¾': '3/4', '⅐': '1/7', '⅑': '1/9', '⅒': '1/10', '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };
const UNITS = {
  g: ['g', 'gram', 'grams'], kg: ['kg', 'kilogram', 'kilograms'],
  oz: ['oz', 'ounce', 'ounces'], lb: ['lb', 'lbs', 'pound', 'pounds'],
  ml: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  l: ['l', 'litre', 'litres', 'liter', 'liters'],
  tsp: ['tsp', 'teaspoon', 'teaspoons'], tbsp: ['tbsp', 'tablespoon', 'tablespoons', 'tbs'],
  cup: ['cup', 'cups', 'us cup', 'us cups'],
  'metric cup': ['metric cup', 'metric cups'],
  'fl oz': ['fl oz', 'fluid ounce', 'fluid ounces'],
  each: ['each', 'whole', 'piece', 'pieces'],
  clove: ['clove', 'cloves'], can: ['can', 'cans', 'tin', 'tins'],
  jar: ['jar', 'jars'], packet: ['packet', 'packets', 'package', 'packages'],
  bag: ['bag', 'bags'], bottle: ['bottle', 'bottles'], box: ['box', 'boxes'],
  bunch: ['bunch', 'bunches'], slice: ['slice', 'slices'], pinch: ['pinch', 'pinches'],
  sprig: ['sprig', 'sprigs'], stalk: ['stalk', 'stalks'], head: ['head', 'heads']
};
const UNIT_LOOKUP = Object.fromEntries(Object.entries(UNITS).flatMap(([unit, names]) => names.map(n => [n, unit])));
const UNIT_PATTERN = Object.keys(UNIT_LOOKUP).sort((a, b) => b.length - a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const UNIT_RE = new RegExp(`^(${UNIT_PATTERN})(?:\\.?(?=\\s|$))\\s*`, 'i');
const MASS = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
// Explicit US cooking volumes. A metric cup is separate; no density conversions.
const VOLUME = { ml: 1, l: 1000, tsp: 4.92892159375, tbsp: 14.78676478125, cup: 236.5882365, 'metric cup': 250, 'fl oz': 29.5735295625 };
const CATEGORY_ORDER = ['Produce', 'Meat & seafood', 'Dairy & eggs', 'Bakery', 'Grains & pasta', 'Cans & jars', 'Pantry', 'Frozen', 'Other'];

const text = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const round = value => Math.round((value + Number.EPSILON) * 1e9) / 1e9;
const hash = value => { let h = 2166136261; for (const c of value) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

function expandFractions(value) {
  return String(value ?? '').replace(/(\d)([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, '$1 $2')
    .replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, x => VULGAR[x]).replace(/⁄/g, '/').trim();
}

export function parseQuantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const s = expandFractions(value);
  if (!s) return null;
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
  let m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[3]) > 0 ? Number(m[1]) + Number(m[2]) / Number(m[3]) : null;
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : null;
  return null;
}

function guessCategory(name, unit = '') {
  const n = name.toLowerCase();
  if (/\bfrozen\b/.test(n)) return 'Frozen';
  if (/\bbell peppers?\b/.test(n)) return 'Produce';
  if (/\b(chicken|beef|pork|turkey|salmon|cod|tuna|shrimp|prawn|sausage|lamb|fish)\b/.test(n)) return 'Meat & seafood';
  if (/\b(cheese|feta|mozzarella|parmesan|cheddar|milk|yogurt|yoghurt|egg|eggs|butter|cream)\b/.test(n) && !/peanut butter|coconut milk|coconut cream|almond milk|oat milk/.test(n)) return 'Dairy & eggs';
  if (['can', 'jar'].includes(unit) || /\b(canned|passata|chickpeas|black beans|kidney beans|coconut milk)\b/.test(n)) return 'Cans & jars';
  if (/\b(bread|tortilla|tortillas|pita|bun|buns|bagel)\b/.test(n)) return 'Bakery';
  if (/\b(rice|pasta|spaghetti|penne|orzo|noodle|noodles|couscous|quinoa|oat|oats|lentils)\b/.test(n)) return 'Grains & pasta';
  if (/\b(oil|salt|pepper|cumin|paprika|oregano|thyme|cinnamon|sugar|flour|sauce|vinegar|honey|mustard|stock|broth|spice|chilli powder|chili powder|sesame|peanut|tahini)\b/.test(n)) return 'Pantry';
  if (/\b(onion|onions|garlic|tomato|tomatoes|broccoli|carrot|carrots|potato|potatoes|lemon|lemons|lime|limes|zucchini|courgette|spinach|lettuce|avocado|avocados|cucumber|cabbage|cilantro|coriander|parsley|basil|ginger|mushroom|mushrooms|pepper|peppers|apple|apples|peas|beans|asparagus|corn)\b/.test(n)) return 'Produce';
  return 'Other';
}

function normalizeUnit(unit) {
  const u = text(unit).toLowerCase().replace(/\.$/, '');
  return UNIT_LOOKUP[u] || u || 'each';
}

export function parseIngredient(input) {
  const raw = text(input);
  let rest = expandFractions(raw);
  let quantity = null, unit = 'each', packageSize = '', note = '';
  if (/^\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?\s*[-–]?\s*(?:inch|inches|cm|centimetres?|centimeters?)\b/i.test(rest)) {
    return { name: raw, quantity: null, unit: 'each', category: guessCategory(raw), note: 'A length is specified, not a count or weight. Check the original ingredient.', raw };
  }
  const range = rest.match(/^(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\s+\d+\/\d+|\/\d+|\.\d+)?)\s*/i);
  if (range) { note = `Amount is a range: ${range[1]}`; rest = rest.slice(range[0].length); }
  else {
    const q = rest.match(/^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)(?=\s|[a-zA-Z(]|$)\s*/);
    if (q) { quantity = parseQuantity(q[1]); rest = rest.slice(q[0].length); }
  }
  // Example: 2 x 400 g cans tomatoes; 1 (400 g) can chickpeas.
  let pack = rest.match(/^(?:x\s*)?\(?\s*(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz|lb|fl\s*oz))\s*\)?\s+(?=(?:can|cans|tin|tins|jar|jars|packet|packets|package|packages)\b)/i);
  if (pack) { packageSize = text(pack[1]).toLowerCase(); rest = rest.slice(pack[0].length); }
  const u = rest.match(UNIT_RE);
  if (u) { unit = normalizeUnit(u[1]); rest = rest.slice(u[0].length).replace(/^of\s+/i, ''); }
  // Some exporters place package size after the unit.
  if (!packageSize && ['can', 'jar', 'packet'].includes(unit)) {
    pack = rest.match(/^\(([^)]+)\)\s*/);
    if (pack) { packageSize = text(pack[1]); rest = rest.slice(pack[0].length); }
  }
  const parts = rest.split(/,\s*/);
  let name = text(parts.shift() || raw || 'Unnamed ingredient');
  const preparation = parts.join(', ');
  if (/\b(to taste|as needed|for serving|optional)\b/i.test(rest) && quantity === null) {
    note = [note, 'Amount not specified'].filter(Boolean).join('; ');
  }
  if (!name || name === '-') name = raw || 'Unnamed ingredient';
  return { name, quantity, unit, category: guessCategory(name, unit), ...(packageSize && { packageSize }), ...(preparation && { preparation }), ...(note && { note }), raw };
}

function normalizeIngredient(value) {
  if (typeof value === 'string') return parseIngredient(value);
  if (!value || typeof value !== 'object') throw new Error('An ingredient must be text or an ingredient object.');
  const name = text(value.name);
  if (!name) throw new Error('An ingredient is missing its name.');
  const unit = normalizeUnit(value.unit);
  const quantity = parseQuantity(value.quantity);
  if (value.quantity != null && value.quantity !== '' && quantity === null) {
    return { ...value, name, quantity: null, unit, category: text(value.category) || guessCategory(name, unit), note: [text(value.note), `Review amount: ${text(value.quantity)}`].filter(Boolean).join('; ') };
  }
  return {
    name, quantity, unit, category: text(value.category) || guessCategory(name, unit),
    ...Object.fromEntries(['canonicalName', 'preparation', 'packageSize', 'note', 'raw'].filter(k => text(value[k])).map(k => [k, text(value[k])]))
  };
}

function safeImage(value) {
  const s = text(value);
  return /^(?:https:\/\/|\.\.?\/|assets\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(s) ? s : null;
}

function safeSourceUrl(value) {
  const s = text(value);
  try {
    const url = new URL(s);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? s : '';
  } catch { return ''; }
}

function sourceDate(value) {
  const s = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const date = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s ? s : '';
}

function normalizeImageAttribution(value) {
  if (!value || typeof value !== 'object') return null;
  const credit = stripMarkup(value.credit), sourceUrl = safeSourceUrl(value.sourceUrl);
  if (!credit || !sourceUrl) return null;
  return {
    credit, sourceUrl,
    ...(text(value.license) && { license: stripMarkup(value.license) }),
    ...(safeSourceUrl(value.licenseUrl) && { licenseUrl: safeSourceUrl(value.licenseUrl) }),
    ...(sourceDate(value.retrievedAt) && { retrievedAt: sourceDate(value.retrievedAt) })
  };
}

// Optional review data must never turn a missing, invalid or unrated value into
// a credible-looking badge. Ratings describe the cited source recipe, including
// when a cook later adapts the recipe saved in this app.
function normalizeRating(value, fallbackUrl) {
  if (!value || typeof value !== 'object') return null;
  const numeric = input => typeof input === 'number' || typeof input === 'string' && input.trim() !== '';
  if (!numeric(value.value) || !numeric(value.count) || !numeric(value.best ?? 5)) return null;
  const score = Number(value.value), count = Number(value.count), best = Number(value.best ?? 5);
  const sourceUrl = safeSourceUrl(value.sourceUrl) || safeSourceUrl(fallbackUrl);
  if (!Number.isFinite(score) || !Number.isFinite(best) || best <= 0 || score <= 0 || score > best || !Number.isSafeInteger(count) || count < 1 || !sourceUrl) return null;
  return { value: score, count, best, sourceUrl, ...(sourceDate(value.retrievedAt) && { retrievedAt: sourceDate(value.retrievedAt) }) };
}

// The prior is a sorting preference, not additional source reviews. Keep it
// separate from source ratings so the original score and count never change.
export const RATING_PRIOR_STARS = 4;
export const RATING_PRIOR_COUNT = 50;

/** Return source stars on a five-point scale and a review-weighted sort score. */
export function recipeRatingStats(recipe) {
  const rating = normalizeRating(recipe?.rating, recipe?.source?.url);
  if (!rating) return null;
  // Divide first so valid, very large source scales cannot overflow at 5*value.
  const stars = 5 * (rating.value / rating.best);
  const total = rating.count + RATING_PRIOR_COUNT;
  const observedWeight = rating.count / total;
  const priorWeight = RATING_PRIOR_COUNT / total;
  // Bounded convex weights avoid multiplying a large count by a source score.
  const weightedScore = observedWeight * stars + priorWeight * RATING_PRIOR_STARS;
  return { stars, count: rating.count, weightedScore };
}

const recipeTitleCollator = new Intl.Collator('en', { sensitivity: 'base' });
function compareRecipeTitles(a, b) {
  const byTitle = recipeTitleCollator.compare(text(a?.title), text(b?.title));
  if (byTitle) return byTitle;
  const aId = text(a?.id), bId = text(b?.id);
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

/** Sort a new array without changing recipes, source ratings, or input order. */
export function sortRecipes(recipes, mode = 'weighted') {
  const selected = ['weighted', 'stars', 'reviews', 'title', 'collection'].includes(mode) ? mode : 'weighted';
  if (selected === 'collection') return [...recipes];
  if (selected === 'title') return [...recipes].sort(compareRecipeTitles);
  return recipes.map(recipe => ({ recipe, stats: recipeRatingStats(recipe) }))
    .sort((a, b) => {
      if (!a.stats || !b.stats) {
        if (a.stats) return -1;
        if (b.stats) return 1;
        return compareRecipeTitles(a.recipe, b.recipe);
      }
      const x = a.stats, y = b.stats;
      const difference = selected === 'weighted'
        ? y.weightedScore - x.weightedScore || y.stars - x.stars || y.count - x.count
        : selected === 'stars'
          ? y.stars - x.stars || y.count - x.count
          : y.count - x.count || y.stars - x.stars;
      return difference || compareRecipeTitles(a.recipe, b.recipe);
    })
    .map(entry => entry.recipe);
}

export function normalizeRecipe(input) {
  if (!input || typeof input !== 'object') throw new Error('Recipe must be an object.');
  const title = text(input.title || input.name);
  if (!title) throw new Error('Recipe is missing a title.');
  const servings = Number(input.servings);
  if (!Number.isInteger(servings) || servings <= 0 || servings > 1000) throw new Error(`“${title}”: add a valid positive whole-number servings value.`);
  const ingredients = (input.ingredients || []).map(normalizeIngredient);
  if (!ingredients.length) throw new Error(`“${title}”: no ingredients found.`);
  const steps = (input.steps || []).map(s => text(typeof s === 'object' ? s.text : s)).filter(Boolean);
  if (!steps.length) throw new Error(`“${title}”: no cooking instructions found.`);
  const rawSource = input.source && typeof input.source === 'object' ? input.source : {};
  const source = {
    name: text(rawSource.name) || 'Your imported recipe', url: safeSourceUrl(rawSource.url),
    kind: rawSource.kind === 'original' ? 'original' : 'imported',
    ...Object.fromEntries(['license', 'attribution', 'adaptations'].filter(key => text(rawSource[key])).map(key => [key, text(rawSource[key])])),
    ...(safeSourceUrl(rawSource.licenseUrl) && { licenseUrl: safeSourceUrl(rawSource.licenseUrl) }),
    ...(sourceDate(rawSource.retrievedAt) && { retrievedAt: sourceDate(rawSource.retrievedAt) })
  };
  const rating = normalizeRating(input.rating, source.url);
  const image = safeImage(input.image);
  const imageAttribution = image && normalizeImageAttribution(input.imageAttribution);
  const recipe = {
    id: text(input.id) || `recipe-${hash(`${title}|${source.url}|${servings}`)}`,
    title, description: text(input.description), servings,
    minutes: Number.isFinite(Number(input.minutes)) && input.minutes !== null && input.minutes !== '' && Number(input.minutes) >= 0 ? Number(input.minutes) : null,
    tags: (Array.isArray(input.tags) ? input.tags : []).map(text).filter(Boolean),
    category: text(input.category) || 'Dinner', ingredients, steps, source,
    ...(rating && { rating }),
    ...(image && { image }),
    ...(imageAttribution && { imageAttribution }),
    ...(/^#[0-9a-f]{3,8}$/i.test(text(input.color)) && { color: text(input.color) })
  };
  if (input.variants && typeof input.variants === 'object') {
    recipe.variants = {};
    for (const [key, variant] of Object.entries(input.variants)) {
      const count = Number(key);
      if (!Number.isInteger(count) || count <= 0 || count > 1000 || !variant || !Array.isArray(variant.ingredients) || !variant.ingredients.length) throw new Error(`“${title}”: invalid serving variant ${key}.`);
      if (variant.servings != null && Number(variant.servings) !== count) throw new Error(`“${title}”: variant ${key} has conflicting servings ${variant.servings}. Correct it before importing.`);
      recipe.variants[key] = {
        servings: count, ingredients: variant.ingredients.map(normalizeIngredient),
        ...(Array.isArray(variant.steps) && variant.steps.length && { steps: variant.steps.map(text) }),
        ...(typeof variant.minutes === 'number' && variant.minutes >= 0 && { minutes: variant.minutes })
      };
    }
  }
  return recipe;
}

/** Fill a missing photo only when both the stable recipe ID and source match.
 * Photographs never replace a saved recipe's food, source rating, or own image.
 */
export function applyRecipePhotoUpdates(records, updates = []) {
  const byId = new Map();
  for (const update of Array.isArray(updates) ? updates : []) {
    if (!update || typeof update !== 'object') continue;
    const id = text(update.id), sourceUrl = safeSourceUrl(update.recipeSourceUrl);
    const image = safeImage(update.image), imageAttribution = normalizeImageAttribution(update.imageAttribution);
    if (!id || !sourceUrl || !image || !imageAttribution) continue;
    // Conflicting catalog entries must not silently choose a photograph.
    if (byId.has(id)) { byId.set(id, null); continue; }
    byId.set(id, { sourceUrl, image, imageAttribution });
  }
  const updatedIds = [];
  const recipes = records.map(recipe => {
    if (safeImage(recipe.image)) return recipe;
    const update = byId.get(recipe.id);
    if (!update || safeSourceUrl(recipe.source?.url) !== update.sourceUrl) return recipe;
    updatedIds.push(recipe.id);
    return { ...recipe, image: update.image, imageAttribution: { ...update.imageAttribution } };
  });
  return { recipes, updatedIds };
}

/** Add newly shipped recipes without changing a saved recipe or personal import. */
export function mergeRecipeCollections(shipped, savedBundled = null, imports = []) {
  const bundled = Array.isArray(savedBundled) ? [...savedBundled] : [];
  const seen = new Set();
  // A collision already inside a backup is ambiguous: a meal refers to its ID,
  // so choosing either stored version would silently change that meal's food.
  for (const recipe of [...bundled, ...imports]) {
    if (seen.has(recipe.id)) throw new Error(`This backup repeats the recipe ID “${recipe.id}”. Give each recipe a unique ID before restoring so plans and shopping totals use the same recipe.`);
    seen.add(recipe.id);
  }
  const addedIds = [];
  for (const recipe of shipped) {
    if (seen.has(recipe.id)) continue;
    bundled.push(recipe);
    addedIds.push(recipe.id);
    seen.add(recipe.id);
  }
  return { bundled, recipes: [...bundled, ...imports], addedIds };
}

export function scaleRecipe(recipe, servings) {
  const count = Number(servings);
  if (!Number.isFinite(count) || count <= 0) throw new Error('Choose a positive number of servings.');
  const variant = recipe.variants?.[String(count)];
  const baseServings = recipe.servings;
  if (!(baseServings > 0)) throw new Error('This recipe has no reliable base serving count.');
  const exact = variant || (count === baseServings ? recipe : null);
  const factor = exact ? 1 : count / baseServings;
  const source = exact || recipe;
  return {
    ...recipe, servings: count, baseServings, scaleFactor: count / baseServings,
    scalingMode: exact ? 'exact' : 'linear',
    ingredients: source.ingredients.map(i => ({ ...i, quantity: i.quantity === null ? null : round(i.quantity * factor) })),
    steps: [...(source.steps || recipe.steps)], minutes: source.minutes ?? recipe.minutes
  };
}

function ingredientIdentity(ingredient) {
  let name = text(ingredient.canonicalName || ingredient.name).toLowerCase().normalize('NFKC').replace(/\s+/g, ' ');
  const aliases = { tomatoes: 'tomato', onions: 'onion', 'yellow onions': 'yellow onion', 'red onions': 'red onion', carrots: 'carrot', lemons: 'lemon', limes: 'lime', eggs: 'egg', avocados: 'avocado', 'garlic cloves': 'garlic', 'garlic clove': 'garlic' };
  name = aliases[name] || name;
  // Essential physical states in preparation text must not disappear during merging.
  const state = text(ingredient.preparation).toLowerCase().match(/\b(?:uncooked|cooked|raw|dry|dried|frozen|fresh|canned|drained|undrained|ground)\b/g) || [];
  // Chopped, packed, sifted, etc. affect how much food fits in a volume measure.
  if (Object.hasOwn(VOLUME, normalizeUnit(ingredient.unit)) && text(ingredient.preparation)) state.push(text(ingredient.preparation).toLowerCase());
  return `${name}|${[...new Set(state)].sort().join(',')}`;
}

function canonicalMeasure(ingredient) {
  const unit = normalizeUnit(ingredient.unit);
  if (Object.hasOwn(MASS, unit)) return { quantity: ingredient.quantity === null ? null : ingredient.quantity * MASS[unit], unit: 'g' };
  if (Object.hasOwn(VOLUME, unit)) return { quantity: ingredient.quantity === null ? null : ingredient.quantity * VOLUME[unit], unit: 'ml' };
  return { quantity: ingredient.quantity, unit };
}

function normalizePackage(value) {
  const s = text(value).toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^(\d+(?:\.\d+)?)(g|kg|ml|l|oz|lb)$/);
  if (!m) return s;
  const unit = m[2];
  if (MASS[unit]) return `${round(Number(m[1]) * MASS[unit])}g`;
  return `${round(Number(m[1]) * VOLUME[unit])}ml`;
}

export function buildShoppingList(plan, recipes) {
  const map = recipes instanceof Map ? recipes : new Map((Array.isArray(recipes) ? recipes : Object.values(recipes || {})).map(r => [r.id, r]));
  const grouped = new Map();
  for (const entry of plan || []) {
    const recipe = map.get(entry.recipeId);
    if (!recipe) continue;
    const scaled = scaleRecipe(recipe, entry.servings);
    for (const ingredient of scaled.ingredients) {
      const measure = canonicalMeasure(ingredient);
      const quantityUnknown = measure.quantity === null || !Number.isFinite(measure.quantity);
      const packageMissing = ['can', 'jar', 'packet', 'bag', 'bottle', 'box'].includes(ingredient.unit) && !ingredient.packageSize;
      const uncertain = quantityUnknown || packageMissing;
      const packageKey = normalizePackage(ingredient.packageSize);
      const key = `${ingredientIdentity(ingredient)}|${measure.unit}|${packageMissing ? `unknown-${recipe.id}-${entry.id}` : packageKey}|${quantityUnknown ? 'unmeasured' : 'measured'}`;
      const qualifier = text(ingredient.preparation);
      if (!grouped.has(key)) grouped.set(key, {
        id: `item-${hash(key)}`, name: `${ingredient.name}${qualifier ? ` (${qualifier})` : ''}`, quantity: quantityUnknown ? null : 0, unit: measure.unit,
        category: ingredient.category || guessCategory(ingredient.name, ingredient.unit),
        ...(ingredient.packageSize && { packageSize: ingredient.packageSize }),
        ...((ingredient.note || packageMissing) && { note: [ingredient.note, packageMissing ? 'Package size not specified; check the original recipe.' : ''].filter(Boolean).join('; ') }), uncertain, contributions: []
      });
      const row = grouped.get(key);
      if (!quantityUnknown) row.quantity = round(row.quantity + measure.quantity);
      row.contributions.push({ entryId: entry.id, recipeId: recipe.id, recipeTitle: recipe.title, quantity: quantityUnknown ? null : round(measure.quantity), unit: measure.unit, servings: entry.servings });
      if (ingredient.note && !row.note?.includes(ingredient.note)) row.note = [row.note, ingredient.note].filter(Boolean).join('; ');
    }
  }
  return [...grouped.values()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category), bi = CATEGORY_ORDER.indexOf(b.category);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.name.localeCompare(b.name);
  });
}

export function formatQuantity(value) {
  if (value === null || !Number.isFinite(Number(value))) return 'As needed';
  const number = Number(value);
  if (number === 0) return '0';
  const whole = Math.floor(number), fraction = number - whole;
  const fractions = [[0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞']];
  for (const [f, label] of fractions) if (Math.abs(fraction - f) < 0.0005) return `${whole || ''}${label}`;
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: number < 10 ? 2 : 1 }).format(number);
}

export function formatAmount(quantity, unit = '', options = {}) {
  if (quantity === null || !Number.isFinite(Number(quantity))) return 'Amount to check';
  const u = normalizeUnit(unit);
  let q = Number(quantity), display = u;
  if (options.compact !== false) {
    if (u === 'g' && q >= 1000) { q /= 1000; display = 'kg'; }
    if (u === 'ml' && q >= 1000) { q /= 1000; display = 'L'; }
  }
  if (display === 'each') return formatQuantity(q);
  if (['can', 'jar', 'packet', 'bag', 'bottle', 'box', 'clove', 'slice', 'sprig', 'stalk', 'head', 'pinch', 'bunch'].includes(display) && q !== 1) display += ['bunch', 'pinch', 'box'].includes(display) ? 'es' : 's';
  return `${formatQuantity(q)} ${display}`;
}

export function shoppingText(rows) {
  let category = '';
  const lines = ['WEEKTABLE · SHOPPING LIST', ''];
  for (const row of rows || []) {
    if (row.category !== category) { category = row.category; lines.push('', category.toUpperCase()); }
    lines.push(`☐ ${formatAmount(row.quantity, row.unit)} ${row.name}${row.packageSize ? ` (${row.packageSize} each)` : ''}${row.uncertain ? ' — check recipe' : ''}`);
  }
  return lines.join('\n').trim();
}

function stripMarkup(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
}

function instructionText(value) {
  if (typeof value === 'string') return value.split(/\n+/).map(stripMarkup).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(instructionText);
  if (!value || typeof value !== 'object') return [];
  if (value.itemListElement) return instructionText(value.itemListElement);
  if (value.text) return [stripMarkup(value.text)];
  if (value.name) return [stripMarkup(value.name)];
  return [];
}

function durationMinutes(value) {
  if (typeof value === 'number') return value;
  const m = text(value).match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  return m ? Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0) + Number(m[4] || 0) / 60 : null;
}

function recipeYield(value) {
  const values = Array.isArray(value) ? value : [value];
  const explicit = values.map(text).map(s => s.match(/^(?:(?:serves?|servings?|portions?|people)\s*:?\s*(\d+)|(\d+)\s*(?:servings?|portions?|people|persons?))$/i)).filter(Boolean).map(m => Number(m[1] || m[2]));
  if (explicit.length) return new Set(explicit).size === 1 && explicit[0] > 0 ? explicit[0] : null;
  for (const item of values) {
    if (typeof item === 'number' && Number.isInteger(item) && item > 0) return item;
    const s = text(item);
    const m = s.match(/^(?:(?:serves?|servings?|portions?|people)\s*:?\s*)?(\d+)\s*(?:(?:servings?|portions?|people|persons?)\b.*)?$/i);
    if (m && Number(m[1]) > 0) return Number(m[1]);
  }
  return null;
}

function fromSchema(recipe) {
  const servings = recipeYield(recipe.recipeYield ?? recipe.servings);
  if (!servings) throw new Error(`“${stripMarkup(recipe.name) || 'Untitled recipe'}”: no reliable serving count. Add a numeric recipeYield or servings value before importing.`);
  const author = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author;
  const rawImage = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
  return normalizeRecipe({
    title: stripMarkup(recipe.name), description: stripMarkup(recipe.description), servings,
    minutes: durationMinutes(recipe.totalTime) ?? ((durationMinutes(recipe.prepTime) ?? 0) + (durationMinutes(recipe.cookTime) ?? 0) || null),
    ingredients: (recipe.recipeIngredient || []).map(stripMarkup), steps: instructionText(recipe.recipeInstructions),
    tags: [recipe.recipeCategory, recipe.recipeCuisine].flat().filter(v => typeof v === 'string'),
    source: {
      name: text(typeof author === 'string' ? author : author?.name) || 'Imported recipe', url: recipe.url || recipe.mainEntityOfPage?.['@id'] || '', kind: 'imported',
      ...(typeof recipe.license === 'string' && { license: recipe.license, licenseUrl: safeSourceUrl(recipe.license) }),
      ...(typeof recipe.creditText === 'string' && { attribution: stripMarkup(recipe.creditText) })
    },
    rating: recipe.aggregateRating && {
      value: recipe.aggregateRating.ratingValue, count: recipe.aggregateRating.ratingCount ?? recipe.aggregateRating.reviewCount,
      best: recipe.aggregateRating.bestRating ?? 5,
      sourceUrl: recipe.url || recipe.mainEntityOfPage?.['@id'] || ''
    },
    image: typeof rawImage === 'object' ? rawImage?.url : rawImage
  });
}

function findRecipes(value, out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) { for (const child of value) findRecipes(child, out, seen); return out; }
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some(t => typeof t === 'string' && /(?:^|[\/#])Recipe$/i.test(t))) { out.push({ schema: true, value }); return out; }
  if ((value.title || value.name) && Array.isArray(value.ingredients) && (Array.isArray(value.steps) || value.recipeInstructions)) { out.push({ schema: false, value }); return out; }
  if (Array.isArray(value.recipes)) findRecipes(value.recipes, out, seen);
  if (Array.isArray(value.importedRecipes)) findRecipes(value.importedRecipes, out, seen);
  for (const key of ['@graph', 'mainEntity', 'itemListElement', 'item']) if (value[key]) findRecipes(value[key], out, seen);
  return out;
}

export function parseRecipeImport(content, fileName = '') {
  const input = String(content ?? '').replace(/^\uFEFF/, '').trim();
  if (!input) throw new Error('The file is empty. Choose a recipe JSON file or saved HTML page.');
  const warnings = [], candidates = [];
  if (/^</.test(input) || /\.html?$/i.test(fileName)) {
    const scripts = [...input.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m => /\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]));
    if (!scripts.length) throw new Error('This HTML file has no embedded Recipe JSON-LD. Use the Add recipe form or create a native JSON recipe with the included data template.');
    for (let i = 0; i < scripts.length; i++) {
      try { findRecipes(JSON.parse(scripts[i][2]), candidates); }
      catch (error) { warnings.push(`Skipped unreadable JSON-LD block ${i + 1}: ${error.message}`); }
    }
  } else {
    let parsed;
    try { parsed = JSON.parse(input); } catch { throw new Error('This file is not valid JSON. Choose a Weektable export, Schema.org Recipe JSON, or saved HTML page.'); }
    findRecipes(parsed, candidates);
  }
  if (!candidates.length) throw new Error('No recipes found. Each recipe needs a title, base servings, ingredients, and cooking steps.');
  const recipes = [], ids = new Set();
  for (const { schema, value } of candidates) {
    try {
      const recipe = schema ? fromSchema(value) : normalizeRecipe(value);
      if (ids.has(recipe.id)) {
        const existing = recipes.find(item => item.id === recipe.id);
        if (JSON.stringify(existing) === JSON.stringify(recipe)) {
          warnings.push(`Skipped unchanged duplicate recipe “${recipe.title}” in this file.`);
          continue;
        }
        const originalId = recipe.id;
        let suffix = 2;
        while (ids.has(`${originalId}-${suffix}`)) suffix++;
        recipe.id = `${originalId}-${suffix}`;
        warnings.push(`“${recipe.title}” reused an id with different content; both versions were preserved.`);
      }
      ids.add(recipe.id); recipes.push(recipe);
      if (recipe.ingredients.some(i => i.quantity === null)) warnings.push(`“${recipe.title}” includes unmeasured or unrecognized quantities. Review the marked ingredients before shopping.`);
      if (recipe.ingredients.some(i => ['can', 'jar', 'packet', 'bag', 'bottle', 'box'].includes(i.unit) && !i.packageSize)) warnings.push(`“${recipe.title}” includes a package without its size. Check the original recipe before buying.`);
    } catch (error) { warnings.push(error.message); }
  }
  return { recipes, warnings };
}

function dateIso(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

export function getWeekStart(value = new Date()) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid date.');
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateIso(date);
}

export function shiftWeek(week, delta) {
  const date = new Date(`${week}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(delta)) throw new Error('Invalid week.');
  date.setDate(date.getDate() + delta * 7);
  return dateIso(date);
}
