# Weektable

**Your own recipe book, weekly meal planner, and consolidated grocery list.**

A small, installable website for iPhone, desktop, and Android. Pick meals for the
week, set each one to **2, 4, or 6 servings**, and shop from the combined list.
Recipes, plans, favourites, and shopping progress stay on your device. There is
no subscription, hosted database, account signup, API key, or required npm
dependency.

**40 recipes are included:** 12 original Weektable starters and 28 credited
adaptations of highly rated recipes from Striped Spatula (9) and Just One
Cookbook (19). All 28 source recipes had ratings of at least **4.5/5 from at
least 10 votes** when checked on **October 26, 2026**. These are ratings of the
original source recipes; the Weektable adaptations have not been kitchen-tested.

The new records contain ingredient quantities, newly written cooking summaries,
and source links. No source photographs or blog narratives are included.
See the [recipe collection guide](docs/RECIPE_COLLECTION.md) and
[recipe source manifest](docs/RECIPE_SOURCES.json) for selection, attribution,
ratings, serving choices, and adaptations. The sourced records are prepared for
personal, noncommercial use and are **not an open-licensed recipe dataset**.
Their source rights and policies are separate from the app's MIT license.

Mealime's recipe and former Pro collections are not included. The
[Mealime source audit](docs/SOURCE_AUDIT.md) records the earlier findings.

## Add the new recipes to an existing Weektable app

For source ratings and detailed attribution, update the app code from this
repository first. Earlier app versions can import the ingredients and methods
but may discard the additional source and rating fields. Export a full backup
before updating an existing installation.

1. Save the supplied **`weektable-recipe-pack.json`** download to your computer
   or iPhone Files. The same 28-recipe pack is included in this repository at
   [`recipe-packs/reader-favourites.json`](recipe-packs/reader-favourites.json).
2. In Weektable, open **My kitchen → Choose recipe files** and choose that file.
3. Review the import report, then export a fresh full backup.

Use **Choose recipe files** for this pack. **Restore a backup** replaces a
kitchen snapshot and is not the recipe-pack import control. Importing the pack
adds recipes to the existing collection and keeps your plans and favourites.
Unchanged duplicates are skipped; differing records with the same ID are
preserved separately.

A new installation of this repository already includes all 40 recipes, so no
pack import is needed. Updating the app also provides source-rating displays
and the **Reader favourites** filter. When an existing installation owns a
saved bundled-recipe snapshot, the update appends new recipe IDs while keeping
its saved ingredients, instructions, and serving variants. Existing personal
imports keep their versions when a later bundle contains the same IDs.

## Get it onto your iPhone

1. Extract this repository ZIP on your computer.
2. Create a GitHub repository and upload the extracted **contents**, including
   `.github`. Put `index.html` at the repository root.
3. In GitHub, set **Settings → Pages → Source → GitHub Actions**.
4. Run or rerun the **Deploy Weektable to GitHub Pages** workflow under Actions.
5. Open the deployed HTTPS URL in Safari on your iPhone.
6. Choose **Share → Add to Home Screen**, enable **Open as Web App** if shown,
   and tap **Add**.
7. Launch the Home Screen app online once to finish offline setup. Import your
   personal recipes in that installed app, then export a backup to Files.

The [step-by-step setup guide](docs/GETTING_STARTED.md) explains Windows,
GitHub browser upload, Git commands, local preview, privacy, and troubleshooting.
The source and deployed website will ordinarily be public on GitHub Pages;
in-app recipe imports are stored on your own device and are not pushed to GitHub.

## What it does

- Search and browse recipes, filter the collection, and save favourites.
- See original-source ratings and vote counts; **Reader favourites** filters for
  at least 4/5 and 10 ratings. Source links, attribution, and adaptation notes
  are available in each sourced recipe.
- Select meals by day and week; use different serving counts for different meals.
- Repeating a recipe counts every occurrence in the shopping totals.
- Open ingredients and step-by-step instructions while cooking.
- Combine compatible ingredients into a list organized by grocery category.
- See which meals contribute to each ingredient total.
- Mark items purchased or already in the pantry; add shopping extras.
- Copy, share where supported by the browser, or print the shopping list.
- Add your own recipe using a form or import supported local recipe files.
- Export and restore a versioned backup of personal recipes, plans, favourites,
  and shopping state.
- Work offline after the first successful online load and service-worker setup.

There is no automatic synchronization between devices. Transfer a backup when
moving to another phone or browser. The app is a progressive web app (PWA), not
an App Store application or an Xcode project. No Apple developer account is
needed for Home Screen installation.

## How the shopping calculations work

For a recipe with no exact serving variant, ingredient quantities are multiplied
by `selected servings / base servings`. A two-person recipe containing 300 g of
chicken needs 600 g for four people and 900 g for six. Every meal occurrence is
then included in that week's totals.

An imported exact 2-, 4-, or 6-serving variant takes precedence over simple
scaling. Numeric quantities embedded in instruction prose, cooking times, and
oven temperatures are **never** blindly multiplied. Use the scaled ingredient
list while following the method; a larger batch may require different pan sizes
and cooking arrangements. The included methods refer to the scaled ingredient list and use fractions for
divided ingredients rather than fixed base amounts. Sauce reduction and other
cooking decisions still need judgment when changing batch size.

Grocery amounts use metric weights and volumes where compatible conversions are
known. `oz` means weight; `fl oz` means fluid volume. `cup`, `tbsp`, and `tsp`
use US definitions; `metric cup` explicitly means 250 ml. There are no assumed
ingredient densities. A cup of flour is not converted to grams, and counted
items are not converted to weight.

Different ingredients, physical states, package sizes, and incompatible units
remain separate. A recipe that lists a can should include its size, such as
`1 (400 g) can chickpeas`. Unmeasured amounts, ranges, ambiguous dimensions, and
missing package sizes are flagged for review. Counts such as 1½ onions are recipe
requirements; decide how many whole items or packages to buy. The app does not
know retailer package sizes or the contents of your pantry.

Some sourced entries are **main dishes only**; their descriptions say when sides
are separate. Those recipes do not silently add rice, salad, or other side-dish
ingredients to your shopping list. Entries for **cooked rice use cooked weight**:
buy ready-to-heat rice or prepare it separately. The app does not reinterpret a
cooked-rice weight as dry rice. Salt, pepper, and other amounts listed only
“to taste” remain visibly unmeasured.

## Import your recipe files

The in-app importer accepts:

| Format | Supported content |
| --- | --- |
| Weektable JSON | One recipe, an array, or `{ "schemaVersion": 1, "recipes": [...] }`. |
| Schema.org Recipe JSON / JSON-LD | Ingredients, yield, instructions, source, timing, and valid available aggregate ratings. |
| Saved HTML | Recipe JSON-LD embedded in a `script` block. No scripts are executed. |
| Weektable backup JSON | Restore the app's personal data through its backup restore control. |

Screenshots, PDFs, a website URL by itself, and arbitrary app databases are not
automatically parsed. Use **Add recipe** to enter or paste their ingredients and
steps, or convert an authorized structured export to the [documented schema](docs/SCHEMA.md).
The parser requires a reliable base serving count and reports skipped recipes
and uncertain quantities. Review imported information before relying on totals.

### Combine a folder of saved recipe files

With Node.js 20 or newer, run this in the repository folder:

```sh
node scripts/import-recipes.mjs ./my-saved-recipes --output imports/my-recipes.json
```

The utility reads local JSON/JSON-LD/HTML files only. It creates the combined JSON
and a companion report listing warnings and failed files. Import the combined
file in the app. This utility makes no network requests and does not download
website recipes. The `imports/` directory is ignored by Git to avoid accidentally
publishing personal data.

## Run on your computer

No installation of npm dependencies is required. From the extracted folder:

```sh
npm start
```

Open the address printed in the terminal. Alternatively, with Python installed:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. Do not open `index.html` using a `file://` URL;
browser modules, JSON loading, and service workers need a server origin.

## Develop, test, and publish

```sh
npm test
npm run build
node scripts/serve.mjs --dist
```

The build validates the bundled recipes, copies an explicit allowlist of static
app files into `dist/`, and gives the service worker a content-based version.
Publish `dist/` to any static HTTPS host. The included GitHub workflow runs tests,
builds, and deploys that directory. Relative URLs support project paths such as
`https://YOUR_USERNAME.github.io/weektable/`.

When developing against the unbuilt source, an old service worker may keep an
older app shell. Use the built preview or unregister the development service
worker in browser developer tools after source changes. Your deployed build
gets a new cache version automatically when source files change.

## Files

| File or directory | Purpose |
| --- | --- |
| `index.html`, `src/app.js`, `src/styles.css` | App screens and interactions. |
| `src/core.js` | Serving arithmetic, conservative grocery aggregation, import parsing. |
| `src/storage.js` | IndexedDB persistence for large recipe collections. |
| `data/recipes.json` | All 40 included recipes, with serving, ingredient, method, source, and available rating metadata. |
| `recipe-packs/reader-favourites.json` | The 28 new sourced recipes as an additive import pack for existing users. |
| `docs/RECIPE_COLLECTION.md`, `docs/RECIPE_SOURCES.json` | Collection notes and per-recipe source/rating evidence. |
| `manifest.webmanifest`, `sw.js`, `assets/` | Home Screen installation, offline shell, original artwork/icons. |
| `scripts/` | Local server, reproducible static build, local-file import utility. |
| `tests/` | Quantity, import, scaling, provenance, collection-update, and offline checks. |
| `.github/workflows/pages.yml` | GitHub Pages deployment. |
| `docs/` | Setup guide, data schema, source audit, verification notes. |

## Backups and limits

Export a backup after importing recipes and after substantial planning changes.
Keep it in iCloud Drive or on your computer. Website storage can be cleared by
the user or evicted by the browser; offline storage is not a permanent archive.
External image URLs may require the internet. Built-in recipe text, instructions,
artwork, and the app shell are cached; imported text is retained in device storage.

The 12 starter recipes are original examples; the 28 sourced adaptations use
newly written summaries of the source recipes' factual quantities and methods.
Neither set was kitchen-tested as part of this software delivery. Source ratings
are dated observations, can change, and do not constitute reviews of these
adaptations. Dietary tags describe recipe content, not an allergy certification. The app does not calculate nutrition, compare grocery prices,
order groceries, or provide automatic household synchronization.

## Licensing and source credit

Application code, original artwork, documentation, and the 12 original starter
recipes are covered by the [MIT license](LICENSE). The original starter recipes
also retain their CC0 source notices.

The 28 credited source adaptations, including their copies in the recipe pack,
are excluded from that MIT/CC0 grant. They retain source attribution and links to
the relevant publisher policies. They are provided for personal, noncommercial
recipe planning; inclusion here does not grant an open license to the source
recipes, photographs, branding, or other publisher content. Review those source
policies before redistributing the collection or using it commercially. The
[collection guide](docs/RECIPE_COLLECTION.md) and [source manifest](docs/RECIPE_SOURCES.json)
record the applicable sources and adaptations. Your own imported material also
retains its separate rights.

Weektable is independent of Mealime, Albertsons, Striped Spatula, and Just One
Cookbook. Source ratings and attribution do not imply publisher endorsement.
