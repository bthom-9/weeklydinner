# # Weektable

**Your own recipe book, weekly meal planner, and consolidated grocery list.**

A small, installable website for iPhone, desktop, and Android. Pick meals for the
week, set each one to **2, 4, or 6 servings**, and shop from the combined list.
Recipes, plans, favourites, and shopping progress stay on your device. There is
no subscription, hosted database, account signup, API key, or required npm
dependency.

**Content included:** 12 original starter recipes. **Content not included:**
the Mealime recipe collection, former Pro collection, or Mealime photography.
This is a working independent app, not a verified Mealime archive. See the
[source audit](docs/SOURCE_AUDIT.md) for the October 26, 2026 findings and official
links. Free access to a service does not itself provide an open dataset export.

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
and cooking arrangements. Original starter methods refer to the ingredient list
rather than repeating ingredient amounts in the steps.

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

## Import your recipe files

The in-app importer accepts:

| Format | Supported content |
| --- | --- |
| Weektable JSON | One recipe, an array, or `{ "schemaVersion": 1, "recipes": [...] }`. |
| Schema.org Recipe JSON / JSON-LD | Ingredients, yield, instructions, source, and available timing. |
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
| `data/recipes.json` | The 12 original starter recipes. |
| `manifest.webmanifest`, `sw.js`, `assets/` | Home Screen installation, offline shell, original artwork/icons. |
| `scripts/` | Local server, reproducible static build, local-file import utility. |
| `tests/` | Quantity, import, scaling, and offline behavior checks. |
| `.github/workflows/pages.yml` | GitHub Pages deployment. |
| `docs/` | Setup guide, data schema, source audit, verification notes. |

## Backups and limits

Export a backup after importing recipes and after substantial planning changes.
Keep it in iCloud Drive or on your computer. Website storage can be cleared by
the user or evicted by the browser; offline storage is not a permanent archive.
External image URLs may require the internet. Built-in recipe text, instructions,
artwork, and the app shell are cached; imported text is retained in device storage.

The 12 starter recipes are original examples and were not kitchen-tested as part
of this software delivery. Dietary tags describe recipe content, not an allergy
certification. The app does not calculate nutrition, compare grocery prices,
order groceries, or provide automatic household synchronization.

Application source, original artwork, and documentation are covered by the
[MIT license](LICENSE). The original starter recipes also carry the CC0 notice
recorded in their source metadata. Separately imported third-party content
retains its own rights and attributions. Weektable is independent of Mealime and
Albertsons.
