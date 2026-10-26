# Verification record

Checked on October 26, 2026.

## Included content

- 12 original Weektable starter recipes, with ingredient quantities and methods.
- Zero bundled Mealime recipes or photographs; no claim of free/Pro coverage.
- No personal recipe collection, account credentials, or QA recipes in the ZIP.
- No browser state or exported test backups in the ZIP.

## Automated checks

`npm test` completed with **20 tests passing** (16 core tests and 4 offline-worker
tests). These verify mixed and Unicode fractions, 2/4/6-person scaling, exact
serving variants, repeated meals, unit conversion, package sizes, unknown amounts,
physical-state and volume-sensitive preparation distinctions, structured imports,
conflicting record IDs, unsafe URL handling, date arithmetic, all bundled
recipes, offline resources beneath a GitHub project path, cache isolation, failed
offline installation, and exclusion of external/non-GET requests.

The local-file batch importer was also exercised against two local records with
the same source ID but different instructions. Both versions were preserved,
the four-serving source variant retained its exact quantity, and the resulting
JSON was successfully imported again.

The final static build completed successfully, validated every starter recipe,
and generated a content-versioned service worker. The source uses no external
application dependencies or font/image CDNs.

## Browser checks

The desktop browser flow was exercised with five meals:

| Day | Recipe | Servings |
| --- | --- | --- |
| Monday | Lemon chicken & herby couscous | 2 |
| Tuesday | Roasted salmon, broccoli & rice | 4 |
| Wednesday | Smoky black bean tacos | 6 |
| Thursday | Creamy tomato & spinach pasta | 4 |
| Friday | Sesame tofu rice bowls | 2 |

The UI produced **40 grocery rows for 18 meal servings**, matching the core
calculation. Example totals included 950 g broccoli, 450 g dry long-grain rice,
14 garlic cloves, and three 400 g cans of black beans. These are verification
results for that specific plan, not a preloaded plan in the delivered app.

Verified interactions included adding the five meals, changing servings,
checking off an ingredient, reloading with saved plans intact, importing two
distinct recipe records, opening exact and scaled serving versions, exporting a
backup, inspecting its preserved recipe and plan fields, and restoring it through
the app. An exact four-person test variant displayed 210 g rice and 25 minutes;
its non-variant six-person version scaled the 100 g two-person baseline to 300 g
while leaving method times unchanged.

Desktop and 390-pixel responsive layouts were inspected. The mobile recipe and
grocery views fit the narrow frame with bottom navigation and shopping controls.
A second-tab test verified that a stale snapshot is rejected with a recoverable
warning instead of silently overwriting newer saved changes.

## Verification limits

The browser preview ran over an ordinary local HTTP development address, where
service-worker registration is deliberately disabled by the app. Offline cache
behavior was verified by the automated service-worker tests; a physical iPhone
Home Screen installation and airplane-mode session were not performed. Perform
that final device check after publishing the HTTPS site.

GitHub deployment was prepared but not performed in a user-owned repository.
The included workflow must run after you upload the source and enable Pages.
The 12 original starter recipes were not kitchen-tested during software QA.

## Updating the app

Run `npm test` and `npm run build` after source changes. Export a full in-app
backup before updating or switching devices. Full backups include the bundled
recipe snapshot as well as imports and planning data, so restoring a backup
preserves the original ingredient amounts across future source changes.
