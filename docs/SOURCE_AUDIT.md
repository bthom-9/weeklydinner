# Mealime source and preservation audit

**Checked October 26, 2026. The full Mealime dataset, including its Pro collection, was NOT downloaded and is NOT included in this repository.**

Weektable is an independent meal-planning app with original starter recipes and local recipe-import support. It is not a complete Mealime archive and is not affiliated with Mealime or Albertsons.

## What the official announcement says

Mealime's [official closure notice](https://www.mealime.com/closing) gives **October 21, 2026** as the discontinuation date. It says Pro recipes and features become available to Mealime users without further subscription charges during the transition. It also says all Mealime recipes remain available through **Meals Hub**, alongside additional recipes, and that Meals Hub has both website and app access.

The notice says personal data will be deleted when Mealime closes and explains that users must establish certain preferences again in Meals Hub. It does not provide a downloadable full recipe dataset or an open license for the collection.

## What was accessible during this check

| Official source | Observation | Limit of the observation |
| --- | --- | --- |
| [Mealime home page](https://www.mealime.com/) | The page remained reachable and displayed the closure banner. | A reachable marketing website does not establish that the app or recipe database remains fully operational. |
| [Public recipe catalogue](https://www.mealime.com/recipes) | The first catalogue page showed 24 recipes and pagination through page 68. | This is not a verified total recipe count. |
| [Catalogue page 68](https://www.mealime.com/recipes?page=68) | It displayed no matching recipes during the check. | Pagination cannot establish complete collection coverage. |
| [Sample four-serving recipe](https://www.mealime.com/recipes/strawberry-panzanella-italian-bread-salad-chicken-feta-mint/31115) | Title, 30-minute time, serving selectors, unit selectors, and cookware appeared in the page's extracted text. | Ingredients and instructions did not appear in that extraction. This does not prove that the underlying page has none. |
| [Same recipe, two servings](https://www.mealime.com/recipes/strawberry-panzanella-italian-bread-salad-chicken-feta-mint/31114) | A different record ID and a 25-minute time were displayed. | Serving versions can differ beyond a simple quantity multiplier. |
| [Mealime web app](https://app.mealime.com/) | Retrieval returned HTTP 503 during the check. | One failed retrieval is not proof of permanent unavailability. |

No official full-library export or public recipe API specification was found in the reviewed sources. No historical Pro flags or complete recipe count were verified. Consequently this project makes no claim to include every free recipe, every Pro recipe, or every serving variant.

## Why free access was not treated as an open dataset

Mealime's [terms of service](https://www.mealime.com/terms-of-service), under **Content on this Application**, reserve content rights and restrict copying, downloading, modification, and republication unless specifically allowed. The **Scraping** section lists automated harvesting among restricted activities without the owner's permission. The terms also recognize explicitly offered personal downloading/sharing features and applicable statutory exceptions.

The closure notice changes access to Pro features; it does not supply a blanket license to redistribute the whole collection. This repository therefore contains no scraped Mealime corpus, copied Mealime photography, or bulk harvesting tool. Its import feature handles files supplied by the user, retaining available source information.

## Practical ways to preserve recipes you can access

### Use the official individual print/share features where they still work

Mealime's [recipe-printing guide](https://support.mealime.com/article/90-how-to-print-a-recipe) describes opening a recipe in the signed-in web app and using the printer icon beneath its instructions. A desktop browser's print dialog can save the result as a PDF. The support article is older, so these controls may no longer be available after the shutdown.

The [official sharing guide](https://support.mealime.com/article/101-how-to-share-recipes-grocery-list-meal-plans-mealime) describes opening an iOS recipe, choosing its More menu, then Share. A shared link is a useful source reference, but a link by itself is not an offline copy. Save the recipe content through an available authorized feature if you need an independent record.

Keep the title, source URL, serving count, ingredient quantities and units, instructions, and any variation notes with each saved recipe. Preserve source attributions. A saved PDF can be read separately, but Weektable does not automatically extract recipe quantities from PDFs or screenshots.

### Ask for a permitted export if you want the whole collection

Mealime lists **hello@mealime.com** on its [official website](https://www.mealime.com/). Request a personal-use export or written permission for an archive, specifically asking whether it includes former Pro recipes and the 2/4/6-serving versions. No message has been sent on your behalf.

If an authorized JSON or HTML export becomes available, use Weektable's importer where its structure is supported, or convert it to the documented [recipe schema](SCHEMA.md). Store the original export alongside the converted file so provenance and exact source quantities remain available.

### Access the official successor

The closure notice links to the [Meals Hub store selector](https://www.safeway.com/db/storelist.html?banner=acm%2Calb%2Cami%2Ccar%2Cjwl%2Cpav%2Cran%2Csaf%2Csha%2Csta%2Ctom%2Cvon%2Cuni%2Chag&page=meal-plans-recipes). It states that meal planning can be used without shopping at an Albertsons Companies store. Canadian registration and regional availability were not independently verified in this audit.

## What counts as an actual archive

A complete preservation result would need a saved manifest of recipe IDs, source URLs, serving variants, successful ingredient/instruction records, failures, and verification counts. It would also need locally preserved assets where allowed and a recoverable backup independent of browser storage. A link catalogue, an app interface, or a successful import of a few recipes cannot demonstrate completeness.

This delivery provides the independent app and import/backup foundation. **It does not fulfill the separate request for a verified full Mealime dataset.**
