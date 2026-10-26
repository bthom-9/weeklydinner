# Put Weektable on your iPhone

Weektable is a small website you can install on your iPhone Home Screen. It runs without a recipe subscription or a server database. The repository includes original starter recipes and supports importing recipe files you have saved or are entitled to use. It does **not** contain the Mealime recipe collection. See [SOURCE_AUDIT.md](SOURCE_AUDIT.md) for the verified findings.

## 1. Unzip the download on Windows

1. Download the repository ZIP.
2. In File Explorer, right-click the ZIP and choose **Extract All**.
3. Open the extracted project folder. The correct folder contains `index.html`, `package.json`, `src`, `data`, and `.github`.

Keep the ZIP as a clean copy of the app. Your personal recipes and meal plans will have their own backup file later.

## 2. Optional: try it on your computer first

Open a terminal in the extracted project folder. With Python installed, run:

```powershell
python -m http.server 8000
```

On Windows, `py -m http.server 8000` is an alternative if `python` is not recognized. Open [http://localhost:8000](http://localhost:8000) in a browser. Keep the terminal open while using this preview; press **Ctrl+C** to stop it.

If you use the repository's Node.js route instead, run:

```powershell
npm start
```

Use the address printed by that command. No application build is required.

**Do not double-click `index.html` to launch the app.** A `file://` address prevents the normal module, data-loading, and offline-worker behavior. Use a local server for testing and the published HTTPS address on your iPhone. Your computer's `localhost` address is not an address your iPhone can use.

## 3. Upload the app to GitHub

For a straightforward GitHub Free setup, create a **public** repository named `weektable`. Upload the app code and its original starter recipes. Your later in-app imports remain in that browser's storage; uploading the app does not upload those imports.

### Browser upload

1. Sign in to [GitHub](https://github.com/) and create the repository.
2. Choose **uploading an existing file**, or **Add file → Upload files** if the repository already has a file.
3. Drag the **contents of the extracted project folder** into the upload area. Include `.github`, which contains the deployment workflow.
4. Commit the files to `main`.
5. Check that `index.html` is at the repository's top level and `.github/workflows/` contains the supplied workflow.

Upload the extracted files, **not the ZIP itself**. Avoid an extra enclosing folder such as `weektable/weektable/index.html`.

### Git alternative

If you prefer Git, create an empty GitHub repository without an initial README, then run these commands from the project folder. Replace `YOUR_USERNAME` with your GitHub account name:

```powershell
git init
git add .
git commit -m "Add Weektable meal planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/weektable.git
git push -u origin main
```

Git may prompt you to sign in. No GitHub token belongs in the app files.

## 4. Turn on GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and select the supplied Pages workflow. If the initial run failed before Pages was enabled, rerun it; alternatively use **Run workflow** if offered.
4. Wait for a successful deployment. Open the resulting website link from the workflow or Pages settings.

For a repository called `weektable`, the usual address is `https://YOUR_USERNAME.github.io/weektable/`. Use the URL GitHub actually reports. The app uses relative asset paths so it can run beneath a repository path.

GitHub's official references: [configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### What becomes public?

Ordinary GitHub Pages hosting makes the deployed website public. A private source repository does not by itself make the site private. GitHub Free supports Pages from public repositories; private-source support depends on your plan. Restricted Pages access is an Enterprise Cloud organization feature. See [GitHub's site visibility documentation](https://docs.github.com/en/enterprise-cloud%40latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).

Keep personal recipe backups, account exports, and any third-party collection you cannot republish **outside the repository**. Import them through the running app instead. This project has no login or cloud synchronization service.

## 5. Install on your iPhone

1. Open the published **HTTPS** address in **Safari** while online.
2. Open **Share**. Depending on Safari's layout, it may be inside the Page Menu.
3. Choose **Add to Home Screen**.
4. Turn on **Open as Web App** if that option appears, then tap **Add**.
5. Launch Weektable using its new Home Screen icon. Let the app finish loading online before trying it offline.

If Add to Home Screen is missing, look under **Edit Actions** in the Share sheet. Apple's current instructions are [Turn a website into an app in Safari on iPhone](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

Install first, then import your personal recipes inside the Home Screen app. If a different browser or the Home Screen app opens without data you entered elsewhere, restore your backup there.

## 6. Plan the week and make your shopping list

Choose recipes for the week and select **2, 4, or 6 servings** for each meal. Repeated meals each contribute their ingredients. Open the grocery list to see compatible ingredient quantities combined, and tick off purchases as you shop.

Review any unmeasured or unrecognized ingredient rows. An ingredient described only as “to taste” cannot become an exact shopping amount. Counts, weights, volumes, and different package sizes are kept distinct when combining them would require a guess. Cooking temperatures and times are not multiplied by the number of servings.

The recipe view gives the ingredients and cooking steps for the chosen serving count. Exact serving variants take precedence when present in an imported file; otherwise ingredient quantities scale from the recipe's base servings. See [SCHEMA.md](SCHEMA.md) for details.

## 7. Import recipes and keep backups

Use the app's import control to choose a supported local file. Supported formats include Weektable recipe JSON, Schema.org Recipe JSON/JSON-LD, and saved HTML containing Recipe JSON-LD. A web address alone, screenshot, or PDF is not a structured recipe import. Review the reported import warnings, serving count, and ingredient quantities before planning meals with imported content.

Use the app's backup export control after importing recipes and after meaningful planning changes. Save the JSON file to **Files → iCloud Drive** or copy it to your computer. Keep an additional copy somewhere independent of the app. To move to another device, import the saved backup there; devices do not synchronize automatically.

Offline caching and browser storage are useful, but they are not permanent archival storage. WebKit documents that website data can be removed under storage pressure, quota limits, or inactivity; persistent-storage requests are not a universal guarantee. See [WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/). Export a backup before clearing website data, replacing your phone, changing the site domain, or removing the installed app.

To check offline use, open the installed app online, wait for it to load, then turn off Wi-Fi and cellular data and reopen it. Check a recipe and your grocery list. External image links in imported recipes may still require the internet; the recipe text is the part to preserve in your backup.

## Troubleshooting

| Problem | Check |
| --- | --- |
| GitHub shows a ZIP download instead of the app | Extract the ZIP and upload its contents, with `index.html` at the repository root. |
| The Pages workflow is missing | Upload the `.github` folder, including `.github/workflows/`. |
| Pages workflow fails at configuration | Set Settings → Pages → Source to GitHub Actions, then rerun the workflow. |
| The app cannot load its recipes locally | Serve the folder with Python or `npm start`; do not use a `file://` URL. |
| Offline launch fails on iPhone | Open the published HTTPS site online first and allow the offline setup to finish; check available device storage. |
| My other device has no plans | Export a backup from the first device and import it on the second. There is no automatic account sync. |
| A recipe import reports missing ingredients or instructions | The file may not contain supported structured recipe data. Check its contents and use the documented JSON format. |

Documentation verified against the linked official sources on **October 26, 2026**.
