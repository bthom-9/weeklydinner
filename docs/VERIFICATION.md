# Verification record

Checked on October 26, 2026.

## Included content

- 40 bundled recipes: 12 original Weektable starters and 28 credited source adaptations.
- The separate import pack contains exactly those 28 additions.
- Every added source had a rating of at least 4.5/5 from 10 votes when checked.
- Nine additions are from Striped Spatula and nineteen from Just One Cookbook.
- Zero bundled Mealime recipes or photographs; no claim of free/Pro coverage.
- No personal recipe collection, account credentials, or QA recipes in the ZIP.
- No browser state or exported test backups in the ZIP.

## Automated checks

`npm test` completed with **35 tests passing** (16 core, 4 offline-worker,
6 rating/provenance, 5 collection-update, and 4 collection-data tests). These verify mixed and Unicode fractions, 2/4/6-person scaling, exact
serving variants, repeated meals, unit conversion, package sizes, unknown amounts,
physical-state and volume-sensitive preparation distinctions, structured imports,
conflicting record IDs, unsafe URL handling, date arithmetic, all bundled
recipes, offline resources beneath a GitHub project path, cache isolation, failed
offline installation, and exclusion of external/non-GET requests.

The local-file batch importer was also exercised against two local records with
the same source ID but different instructions. Both versions were preserved,
the four-serving source variant retained its exact quantity, and the resulting
JSON was successfully imported again.

The final static build completed successfully, validated all 40 bundled recipes,
and generated a content-versioned service worker. The source uses no external
application dependencies or font/image CDNs.

## Added collection checks

The 28 added recipes were validated at 2, 4 and 6 servings: **84 serving cases**.
Ratings and attribution survive normalization and serving changes. New collection
updates append IDs while preserving saved recipe versions, personal imports and
existing meal references; repeated updates are idempotent. Invalid ratings,
unsafe links and impossible observation dates do not produce credible badges.

A fixed five-meal week uses Oyakodon (4 servings), eggplant donburi (2), miso
salmon (6), beef and broccoli (2), and original sesame tofu bowls (2). Its
independently calculated totals include 1,500 g cooked Japanese rice,
1,020 g salmon, 163.080883 ml soy sauce, 162.654413 ml mirin and 73.933824 ml sake.
The 150 g dry long-grain rice remains separate. Cornstarch measured in grams
remains separate from cornstarch measured in volume; unmeasured oil remains
flagged alongside the measured oil requirement. Display values are rounded.

The browser was opened over the previous QA kitchen. It reported 28 newly added
included recipes and retained the prior five-meal plan, shopping progress and
two test imports. Settings showed **40 included recipes and 2 QA imports**;
none of that browser state is shipped. The reader-favourites filter returned
28 matches. Recipe cards and detail views showed the recorded source rating,
vote count, date, source link and attribution.

Oyakodon's visible rice quantity changed correctly between 500 g, 1 kg and
1.5 kg for 2, 4 and 6 servings. Its cooking duration and instruction temperatures
remained unchanged. The recipe detail and source-rating panel were inspected
in desktop and 390-pixel iframe layouts. Adding a six-serving Oyakodon to the
existing five-meal QA week produced 48 grocery rows for 24 total servings. The
UI showed 1.5 kg cooked rice separately from 450 g dry rice, 850.5 g chicken
thighs, 12 eggs and the combined 118.7 ml soy sauce total.

## Earlier browser checks, retained

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
Neither the original recipes nor the 28 new adaptations were kitchen-tested
during software QA. The rated scores belong to the linked original recipes.

## Updating the app

Run `npm test` and `npm run build` after source changes. Export a full in-app
backup before updating or switching devices. Full backups include the bundled
recipe snapshot as well as imports and planning data, so restoring a backup
preserves the original ingredient amounts across future source changes.
