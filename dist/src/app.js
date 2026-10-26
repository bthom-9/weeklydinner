import {
  normalizeRecipe, mergeRecipeCollections, parseIngredient, scaleRecipe, buildShoppingList,
  formatAmount, shoppingText, parseRecipeImport, getWeekStart, shiftWeek,
} from './core.js';
import { readState, writeState, requestPersistentStorage } from './storage.js';

const KEY = 'weektable.state.v1';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const ui = { view: 'recipes', search: '', filter: 'all', week: getWeekStart(), modal: null, addDay: null, visible: 24, importResult: '', offline: 'Preparing offline access…', storageWarning: '' };
let recipes = [];
let bundled = [];
let shippedRecipes = [];
let toastTimer;
let previousFocus;
let state = freshState();

function freshState() {
  return { version: 1, defaultServings: 4, favorites: [], plan: [], imports: [], bundledRecipes: null, shopping: {}, lastBackup: null };
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const icons = {
  recipes: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5zm0 13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  basket: '<path d="m3 10 2.1 10h13.8L21 10ZM8 10l4-7 4 7M9 14v3m6-3v3"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  leaf: '<path d="M20 4c-8-1-16 4-14 11 6 6 16 1 14-11ZM4 21 16 9"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  share: '<path d="M12 16V2m-4 4 4-4 4 4M7 9H4v12h16V9h-3"/>',
  print: '<path d="M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6zM17 12h1"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  edit: '<path d="m15 3 6 6L9 21H3v-6Zm-2 2 6 6"/>',
  shield: '<path d="m12 3 8 4v5c0 5-8 9-8 9S4 17 4 12V7Zm-4 9 3 3 5-6"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 19h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
};
function icon(name, size = 20, cls = '') { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${cls}">${icons[name] || icons.info}</svg>`; }
function safeLink(url, image = false) {
  if (!url || typeof url !== 'string') return '';
  try {
    const resolved = new URL(url, location.href);
    if (!['http:', 'https:'].includes(resolved.protocol)) return '';
    if (image && resolved.origin !== location.origin && resolved.protocol !== 'https:') return '';
    return resolved.href;
  } catch { return ''; }
}
function ratingMarkup(recipe, detail = false) {
  const rating = recipe.rating;
  if (!rating) return '';
  const count = new Intl.NumberFormat().format(rating.count);
  const score = `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(rating.value)}/${rating.best}`;
  const label = `${score} from ${count} rating${rating.count === 1 ? '' : 's'} on the source recipe`;
  const badge = `<div class="recipe-rating" aria-label="${esc(label)}"><span class="rating-star" aria-hidden="true">★</span><strong>${esc(score)}</strong><span>(${esc(count)} source rating${rating.count === 1 ? '' : 's'})</span></div>`;
  if (!detail) return badge;
  const link = safeLink(rating.sourceUrl);
  const source = link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(recipe.source.name)}</a>` : esc(recipe.source.name);
  const date = rating.retrievedAt ? new Date(`${rating.retrievedAt}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return `<div class="source-rating-detail">${badge}<p>Reader rating for the original recipe at ${source}.${date ? ` Recorded ${esc(date)}.` : ''} Ratings can change; they do not rate edits made in this app.</p></div>`;
}
function sourceFootnote(recipe) {
  const source = recipe.source;
  const link = safeLink(source.url), license = safeLink(source.licenseUrl);
  return `<div class="source-footnote"><strong>Source: ${esc(source.name)}</strong>${link ? ` · <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : ''}${source.attribution ? `<p>${esc(source.attribution)}</p>` : ''}${source.license || license ? `<p>Reuse: ${license ? `<a href="${esc(license)}" target="_blank" rel="noopener noreferrer">${esc(source.license || 'Read source reuse terms')} ↗</a>` : esc(source.license)}</p>` : ''}${source.adaptations ? `<p>Adaptations: ${esc(source.adaptations)}</p>` : ''}${source.kind === 'original' ? '<p>An original Weektable starter recipe.</p>' : ''}</div>`;
}
function isPersonalRecipe(recipe) { return state.imports.some(item => item.id === recipe.id); }
function servingButtons(value, action, id = '') {
  return `<div class="serving-control" role="group" aria-label="Number of servings">${[2, 4, 6].map(n => `<button type="button" class="${value === n ? 'active' : ''}" aria-pressed="${value === n}" data-action="${action}" data-id="${esc(id)}" data-value="${n}">${n}</button>`).join('')}</div>`;
}
function dateAt(week, offset = 0) { const date = new Date(`${week}T12:00:00`); date.setDate(date.getDate() + offset); return date; }
function weekLabel(week = ui.week) {
  const start = dateAt(week), end = dateAt(week, 6);
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
function currentPlan() { return state.plan.filter(entry => entry.week === ui.week); }
function findRecipe(id) { return recipes.find(recipe => recipe.id === id); }
function rebuildRecipes() {
  // Keep every saved recipe version. A later deployment may append new IDs,
  // but cannot replace ingredients used by a saved plan or a personal import.
  const hasSnapshot = Array.isArray(state.bundledRecipes);
  const merged = mergeRecipeCollections(shippedRecipes, state.bundledRecipes, state.imports);
  bundled = merged.bundled;
  recipes = merged.recipes;
  if (hasSnapshot) state.bundledRecipes = bundled;
  return hasSnapshot ? merged.addedIds.length : 0;
}
function getShoppingState() {
  if (!state.shopping[ui.week]) state.shopping[ui.week] = { checked: {}, pantry: {}, manual: [] };
  const result = state.shopping[ui.week];
  result.checked ||= {}; result.pantry ||= {}; result.manual ||= [];
  return result;
}
function fingerprint(row) { return `${row.quantity ?? '?'}|${row.unit}|${row.packageSize || ''}|${row.note || ''}`; }
function shoppingRows() {
  const rows = buildShoppingList(currentPlan(), recipes);
  return [...rows, ...getShoppingState().manual.map(item => ({ ...item, category: 'Extras', contributions: [], manual: true, uncertain: item.quantity === null }))];
}
function persist() {
  writeState(state).catch(error => {
    if (!ui.storageWarning) toast(error.message || 'This browser could not save changes. Export a backup before closing.');
    ui.storageWarning = error.message || 'This browser could not save changes. Please export a backup before closing this page.';
    render();
  });
}
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('show'), 3800);
}
function plateArt(recipe, detail = false) {
  const tags = `${recipe.title} ${recipe.tags?.join(' ') || ''}`.toLowerCase();
  const seed = [...recipe.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = ['#e9e9d8', '#eadfcf', '#e6eadb', '#e5e5d6', '#ebded0', '#e0e8df'];
  const background = /^#[a-f0-9]{6}$/i.test(recipe.color || '') ? recipe.color : palette[seed % palette.length];
  const isPasta = /pasta|noodle|spaghetti|linguine|orzo/.test(tags);
  const isFish = /salmon|fish|cod|tuna/.test(tags);
  const isTaco = /taco|wrap|fajita|quesadilla/.test(tags);
  const isSoup = /soup|stew|curry|chili/.test(tags);
  let food = '';
  if (isPasta) {
    for (let i = 0; i < 15; i++) {
      const x = 112 + (i % 5) * 17, y = 71 + Math.floor(i / 5) * 22;
      food += `<path d="M${x} ${y}q-15 6-8 18t18 8q13-1 9-13" fill="none" stroke="${i % 2 ? '#dfb96c' : '#efcf86'}" stroke-width="8" stroke-linecap="round"/>`;
    }
  } else if (isFish) {
    food += '<path d="m111 74 75-9q23 2 21 19l-11 47q-6 13-23 12l-65-8q-15-2-10-20Z" fill="#dc8b6b"/><path d="m117 80 61-7m-65 21 68-8m-72 23 69-9m-70 23 65-9" stroke="#f2bc94" stroke-width="4" fill="none"/>';
  } else if (isTaco) {
    food += '<path d="M90 94q19-50 50-18l16 69q-50-2-66-51" fill="#e7bc68"/><path d="M145 75q44-34 63 18l-21 52q-40-5-42-70" fill="#edd28d"/><path d="m110 85 29 43m28-45 21 44" stroke="#759452" stroke-width="17" stroke-linecap="round"/><path d="m113 89 23 30m35-27 10 23" stroke="#b9724b" stroke-width="10" stroke-linecap="round"/>';
  } else if (isSoup) {
    food += '<ellipse cx="152" cy="107" rx="71" ry="49" fill="#e2ab61"/><ellipse cx="150" cy="102" rx="63" ry="43" fill="#c58647"/>';
    for (let i = 0; i < 17; i++) food += `<ellipse cx="${111 + (i * 23) % 83}" cy="${78 + (i * 17) % 48}" rx="7" ry="5" fill="${i % 2 ? '#dfba79' : '#b66c49'}" transform="rotate(${i * 21} ${111 + (i * 23) % 83} ${78 + (i * 17) % 48})"/>`;
  } else {
    for (let i = 0; i < 27; i++) food += `<ellipse cx="${104 + (i * 17) % 99}" cy="${70 + (i * 13) % 68}" rx="9" ry="4" fill="${i % 2 ? '#f4e5b6' : '#e9d59e'}" transform="rotate(${i * 21} ${104 + (i * 17) % 99} ${70 + (i * 13) % 68})"/>`;
    if (/chicken|turkey|beef|pork/.test(tags)) food += '<path d="m120 79 55-9 17 32-58 17-22-20Z" fill="#c78b50"/><path d="m124 84 52-6m-50 18 55-11m-45 22 48-12" stroke="#a66d3e" stroke-width="3"/>';
  }
  for (let i = 0; i < 10; i++) {
    const x = 90 + (i * 37 + seed) % 123, y = 65 + (i * 29) % 79;
    food += `<ellipse cx="${x}" cy="${y}" rx="${8 + i % 4}" ry="6" fill="${i % 2 ? '#698b4d' : '#8aab63'}" transform="rotate(${i * 31} ${x} ${y})"/>`;
  }
  for (let i = 0; i < 6; i++) food += `<circle cx="${104 + (i * 29 + seed) % 99}" cy="${76 + (i * 23) % 59}" r="6" fill="${i % 2 ? '#c96c4d' : '#e58b5c'}"/><circle cx="${103 + (i * 29 + seed) % 99}" cy="${75 + (i * 23) % 59}" r="2" fill="#f6d49a"/>`;
  return `<svg viewBox="0 0 300 205" role="img" aria-label="Illustrated meal plate" preserveAspectRatio="${detail ? 'xMidYMid slice' : 'xMidYMid meet'}"><rect width="300" height="205" fill="${background}"/><path d="M0 160 300 55v150H0" fill="#ffffff0d"/><path d="m248 25 24 155" stroke="#c6cbb751" stroke-width="17"/><path d="m38 32-20 138" stroke="#c4c5b546" stroke-width="4"/><path d="m29 24-3 25m10-26-3 25m10-23-3 23" stroke="#b6bfab80" stroke-width="3" stroke-linecap="round"/><ellipse cx="153" cy="114" rx="104" ry="82" fill="#82896b15"/><ellipse cx="150" cy="103" rx="105" ry="82" fill="#fbfaf0"/><ellipse cx="150" cy="103" rx="88" ry="68" fill="#f1efdf"/><ellipse cx="150" cy="103" rx="82" ry="63" fill="#f7f5e9"/>${food}<path d="M244 157q18-4 18 15-17 5-18-15m9 16q12-7 17 6-12 10-17-6" fill="#759563"/><path d="m250 179 11-22" stroke="#688657" stroke-width="2"/></svg>`;
}
function recipeArt(recipe, detail = false) {
  const src = safeLink(recipe.image, true);
  return src ? `<img src="${esc(src)}" alt="${esc(recipe.title)}" loading="${detail ? 'eager' : 'lazy'}" referrerpolicy="no-referrer">` : plateArt(recipe, detail);
}
function ingredientEditText(item) {
  if (item.raw) return item.raw;
  const quantity = item.quantity === null ? '' : String(item.quantity);
  const unit = item.unit === 'each' ? '' : item.unit;
  // A package qualifier belongs before the unit for an unambiguous round trip:
  // "1 (400 g) can chickpeas", not "1 can chickpeas (400 g)".
  const text = [quantity, item.packageSize ? `(${item.packageSize})` : '', unit, item.name].filter(Boolean).join(' ');
  return `${text}${item.preparation ? `, ${item.preparation}` : ''}`;
}
function heroArt() { return '<svg class="hero-art" viewBox="0 0 330 270" fill="none" aria-hidden="true"><path d="M160 249c-1-74 21-123 74-190" stroke="#93a780" stroke-width="3"/><path d="M200 149c-69 3-91-37-92-64 50-4 87 14 92 64Z" fill="#b4c6a1"/><path d="M208 136c-2-53 23-90 69-102 14 48-19 89-69 102Z" fill="#a2ba8b"/><path d="M174 205c-61 7-95-12-111-56 52-13 99 5 111 56Z" fill="#bed0a8"/><path d="M176 201c11-56 42-73 87-66-4 41-34 67-87 66Z" fill="#9fb78b"/><path d="M235 92c-10-44-3-71 23-94 27 31 22 58-23 94Z" fill="#c5d5b4"/><path d="M92 247c-14-26-16-57-7-91" stroke="#aabc94" stroke-width="2"/><path d="M84 200c-34-2-53-21-53-44 29-2 50 19 53 44Z" fill="#c5d5b4"/><path d="M86 225c-1-34 15-49 42-51 7 27-10 44-42 51Z" fill="#c7d7b6"/><circle cx="279" cy="213" r="15" fill="#d8a377" opacity=".65"/><path d="m275 198 7-8" stroke="#9ca881" stroke-width="3" stroke-linecap="round"/></svg>'; }
function navMarkup(mobile = false) {
  const links = [['recipes', 'recipes', mobile ? 'Recipes' : 'Recipe collection'], ['plan', 'calendar', 'This week'], ['shopping', 'basket', 'Shopping list'], ['settings', 'settings', mobile ? 'My kitchen' : 'My kitchen']];
  return links.map(([view, symbol, label]) => `<button type="button" class="${mobile ? '' : 'nav-item '}${ui.view === view ? 'active' : ''}" data-action="navigate" data-view="${view}" ${ui.view === view ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${view === 'plan' && currentPlan().length ? `<span class="${mobile ? 'nav-badge' : 'nav-count'}">${currentPlan().length}</span>` : ''}</button>`).join('');
}
function render() {
  const focusId = document.activeElement?.id;
  const selection = document.activeElement instanceof HTMLInputElement ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  const planCount = currentPlan().length;
  const headings = { recipes: 'A recipe for a calmer week', plan: 'A good week starts here', shopping: 'A little list. A lot less thinking.', settings: 'Make yourself at home' };
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a href="#recipes" class="brand" data-action="navigate" data-view="recipes"><span class="brand-icon">w.</span><span>weektable</span></a><div class="brand-caption">Make room for dinner</div><nav class="side-nav" aria-label="Main navigation">${navMarkup()}</nav><div class="sidebar-card"><h3>${planCount >= 5 ? 'Dinner is looking good.' : 'A little plan goes a long way.'}</h3><p>${planCount} of your 5-meal goal planned.<br>${planCount >= 5 ? 'Your shopping list is ready when you are.' : 'Pick a few favourites. We’ll handle the list.'}</p><div class="progress-track" role="progressbar" aria-label="Weekly meal goal" aria-valuenow="${Math.min(planCount, 5)}" aria-valuemin="0" aria-valuemax="5"><span style="width:${Math.min(planCount / 5 * 100, 100)}%"></span></div></div><div class="sidebar-bottom"><div class="status"><span class="status-dot ${navigator.onLine ? '' : 'offline'}"></span>${navigator.onLine ? 'Your kitchen, saved on this device' : 'You’re offline. Keep cooking.'}</div>No account. Just good food.</div></aside><div class="main-shell"><header class="topbar"><div><div class="topbar-eyebrow">Your everyday kitchen companion</div><div class="topbar-title">${headings[ui.view]}</div><a href="#recipes" class="brand mobile-brand" data-action="navigate" data-view="recipes"><span class="brand-icon">w.</span><span>weektable</span></a></div><button class="week-pill" data-action="navigate" data-view="plan" aria-label="View plan for ${esc(weekLabel())}">${icon('calendar', 16)}${esc(weekLabel())}</button></header><main id="main" class="main-content" tabindex="-1">${ui.storageWarning ? `<div class="notice">${esc(ui.storageWarning)} <button class="text-button" data-action="backup">Export backup</button></div>` : ''}${ui.view === 'recipes' ? recipesView() : ui.view === 'plan' ? planView() : ui.view === 'shopping' ? shoppingView() : settingsView()}</main></div><nav class="mobile-nav" aria-label="Main navigation">${navMarkup(true)}</nav></div>`;
  if (focusId) {
    const input = document.getElementById(focusId);
    if (input) { input.focus({ preventScroll: true }); if (selection && input.setSelectionRange) input.setSelectionRange(...selection); }
  }
}
function recipesView() {
  let filtered = recipes.filter(recipe => {
    const search = `${recipe.title} ${recipe.tags.join(' ')} ${recipe.ingredients.map(item => item.name).join(' ')}`.toLowerCase();
    if (!search.includes(ui.search.toLowerCase().trim())) return false;
    if (ui.filter === 'quick') return recipe.minutes && recipe.minutes <= 30;
    if (ui.filter === 'vegetarian') return recipe.tags.some(tag => /vegetarian|vegan|plant.based/i.test(tag));
    if (ui.filter === 'favorites') return state.favorites.includes(recipe.id);
    if (ui.filter === 'imports') return isPersonalRecipe(recipe);
    if (ui.filter === 'rated') return recipe.rating && recipe.rating.value / recipe.rating.best >= 0.8 && recipe.rating.count >= 10;
    return true;
  });
  const chips = [['all', 'All recipes'], ['rated', 'Reader favourites'], ['quick', '30 minutes or less'], ['vegetarian', 'Plant-forward'], ['favorites', 'Favourites'], ['imports', 'My imports']];
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow">A place for your everyday favourites</div><h1>A little planning.<br>A much better week.</h1><p>Choose what sounds good. Set the table for 2, 4 or 6.<br>Leave the shopping list to us.</p></div>${heroArt()}</section><div class="section-head"><div><h2>What sounds good?</h2><p>${recipes.length} recipes in your kitchen${ui.addDay ? ` · Adding to ${esc(ui.addDay)}` : ''}</p></div><button class="text-button" data-action="new-recipe">${icon('plus', 15)} Add a recipe</button></div><div class="search-row"><div class="search-wrap">${icon('search', 19)}<input id="recipe-search" type="search" placeholder="Find a recipe or an ingredient…" aria-label="Search recipes and ingredients" value="${esc(ui.search)}" autocomplete="off"></div><button class="filter-button" data-action="navigate" data-view="settings">${icon('upload', 16)} Import</button></div><div class="filter-chips" aria-label="Recipe filters">${chips.map(([id, label]) => `<button class="chip ${ui.filter === id ? 'active' : ''}" aria-pressed="${ui.filter === id}" data-action="filter" data-filter="${id}">${label}</button>`).join('')}</div>${filtered.length ? `<div class="recipes-grid">${filtered.slice(0, ui.visible).map(recipeCard).join('')}</div>${filtered.length > ui.visible ? `<div style="text-align:center;margin-top:25px"><button class="button secondary" data-action="more-recipes">Show more recipes ${icon('plus', 15)}</button><p class="scroll-hint">Showing ${ui.visible} of ${filtered.length}</p></div>` : ''}` : emptyState(ui.search ? 'Nothing on the menu yet.' : 'Room for a new favourite.', ui.search ? 'Try another name or ingredient. You can also add your own recipe.' : ui.filter === 'favorites' ? 'Tap the little heart on any recipe to save it here.' : ui.filter === 'imports' ? 'Bring your saved recipe files into My kitchen, or write down a recipe you love.' : 'Try another filter to explore your collection.', 'recipes', 'Show all recipes', 'reset-filters')}<div class="bottom-note">${icon('leaf', 13)}Original starters and recipes from credited sources. Source ratings refer to the original recipe; Reader favourites have at least 10 ratings and a score of 4/5 or better.</div>`;
}
function recipeCard(recipe) {
  const favorite = state.favorites.includes(recipe.id);
  return `<article class="recipe-card"><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${esc(recipe.id)}" aria-label="${favorite ? 'Remove from' : 'Add to'} favourites: ${esc(recipe.title)}" aria-pressed="${favorite}">${icon('heart', 16)}</button><button class="recipe-art-button" data-action="open-recipe" data-id="${esc(recipe.id)}" aria-label="View ${esc(recipe.title)}">${recipeArt(recipe)}</button><div class="recipe-card-body"><div class="recipe-tags">${recipe.tags.slice(0, 2).map(tag => `<span class="recipe-tag">${esc(tag)}</span>`).join('<span style="color:#c3cbb7;font-size:8px">·</span>')}</div><button class="card-title-button" data-action="open-recipe" data-id="${esc(recipe.id)}"><h3>${esc(recipe.title)}</h3></button><p class="recipe-description">${esc(recipe.description)}</p>${ratingMarkup(recipe)}<div class="recipe-meta"><span>${icon('clock', 13)}${recipe.minutes ? `${recipe.minutes} min` : 'Time not listed'}</span><span>${icon('people', 13)}${recipe.servings} servings</span></div></div><div class="recipe-card-footer"><span class="source-label">${recipe.source.kind === 'original' ? 'WEEKTABLE ORIGINAL' : isPersonalRecipe(recipe) ? 'YOUR COLLECTION' : 'SOURCE RECIPE'}</span><button class="add-button" data-action="quick-add" data-id="${esc(recipe.id)}">${icon('plus', 14)} Add to week</button></div></article>`;
}
function weekControls() { return `<div class="week-controls"><button class="icon-button" data-action="week" data-delta="-1" aria-label="Previous week">${icon('left')}</button><strong class="week-range">${esc(weekLabel())}</strong><button class="icon-button" data-action="week" data-delta="1" aria-label="Next week">${icon('right')}</button></div>`; }
function planView() {
  const plan = currentPlan();
  const servings = plan.reduce((sum, entry) => sum + entry.servings, 0);
  return `<div class="page-intro"><div class="eyebrow">A bit of intention. A lot less effort.</div><h1>Your week, on the table.</h1><p>Plan five dinners, or make room for more. Each meal can serve 2, 4 or 6.</p></div><div class="toolbar">${weekControls()}<div class="toolbar-actions">${ui.week !== getWeekStart() ? '<button class="button tertiary" data-action="today">This week</button>' : ''}<button class="button secondary" data-action="navigate" data-view="recipes">${icon('plus', 16)} Add meals</button></div></div><div class="plan-goal">${icon(plan.length >= 5 ? 'check' : 'leaf', 22)}<span>${plan.length >= 5 ? `<strong>${plan.length} meals planned. A good week is taking shape.</strong>` : `<strong>${plan.length} of 5 dinners planned.</strong> Pick what you love, and we’ll put it all on one list.`}</span></div><div class="plan-layout"><div class="plan-days">${DAYS.map((day, index) => {
    const entries = plan.filter(entry => entry.day === day);
    const date = dateAt(ui.week, index);
    const today = date.toDateString() === new Date().toDateString();
    return `<section class="plan-day ${today ? 'today' : ''}"><div class="day-header"><h3 class="day-name">${day}<span class="day-date">${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></h3>${entries.length ? `<button class="text-button" style="min-height:24px;font-size:10px" data-action="add-day" data-day="${day}">${icon('plus', 12)} Add</button>` : ''}</div>${entries.length ? entries.map(planEntry).join('') : `<button class="empty-day" data-action="add-day" data-day="${day}">${icon('plus', 15)} Something good goes here</button>`}</section>`;
  }).join('')}</div><aside class="plan-summary"><div class="eyebrow">The week at a glance</div><h3>Dinner, sorted.</h3><div class="summary-metric"><span>Meals planned</span><strong>${plan.length}</strong></div><div class="summary-metric"><span>Total servings</span><strong>${servings}</strong></div><div class="summary-metric"><span>Unique recipes</span><strong>${new Set(plan.map(entry => entry.recipeId)).size}</strong></div><p>Your shopping list combines ingredients from every meal, using each meal’s serving count.</p><button class="button" data-action="navigate" data-view="shopping">View shopping list ${icon('arrow', 15)}</button></aside></div>${plan.length ? `<div class="settings-actions" style="margin-top:24px"><button class="button" data-action="navigate" data-view="shopping">${icon('basket', 17)} Open shopping list</button><button class="text-button" data-action="clear-week">Clear this week</button></div>` : ''}`;
}
function planEntry(entry) {
  const recipe = findRecipe(entry.recipeId);
  if (!recipe) return '';
  const scaled = scaleRecipe(recipe, entry.servings);
  return `<div class="meal-item"><button class="meal-thumb" data-action="open-entry" data-id="${esc(entry.id)}" aria-label="Cook ${esc(recipe.title)}">${recipeArt(recipe)}</button><div class="meal-info"><button class="card-title-button" data-action="open-entry" data-id="${esc(entry.id)}"><h3>${esc(recipe.title)}</h3></button><div class="recipe-meta"><span>${icon('clock', 12)}${scaled.minutes ? `${scaled.minutes} min` : 'Time not listed'}</span></div><div class="meal-controls">${servingButtons(entry.servings, 'plan-servings', entry.id)}<span class="serving-label">servings</span><select class="move-day" data-entry="${esc(entry.id)}" aria-label="Move ${esc(recipe.title)} to another day" style="font-size:10px;padding:5px 7px;border-radius:7px">${DAYS.map(day => `<option ${day === entry.day ? 'selected' : ''}>${day}</option>`).join('')}</select></div></div><div class="meal-side"><button data-action="duplicate-entry" data-id="${esc(entry.id)}" aria-label="Repeat ${esc(recipe.title)}">${icon('copy', 14)}</button><button data-action="remove-entry" data-id="${esc(entry.id)}" aria-label="Remove ${esc(recipe.title)}">${icon('close', 15)}</button></div></div>`;
}
function shoppingView() {
  const plan = currentPlan(), rows = shoppingRows(), shop = getShoppingState();
  const pantry = rows.filter(row => shop.pantry[row.id] === fingerprint(row));
  const needed = rows.filter(row => shop.pantry[row.id] !== fingerprint(row));
  const checkedCount = needed.filter(row => shop.checked[row.id] === fingerprint(row)).length;
  const grouped = new Map();
  for (const row of needed) { const group = row.category || 'Other'; if (!grouped.has(group)) grouped.set(group, []); grouped.get(group).push(row); }
  return `<div class="print-heading">Weektable shopping list · ${esc(weekLabel())}</div><div class="page-intro"><div class="eyebrow">One trip. Everything you need.</div><h1>The shopping list.</h1><p>Your week’s ingredients, added up and ready to go.</p></div><div class="toolbar">${weekControls()}${rows.length ? `<div class="toolbar-actions"><button class="button secondary" data-action="copy-shopping">${icon('copy', 15)} Copy</button><button class="button secondary" data-action="share-shopping">${icon('share', 15)} Share</button><button class="icon-button" data-action="print" aria-label="Print shopping list">${icon('print', 17)}</button></div>` : ''}</div>${rows.length ? `<div class="shopping-summary"><div class="summary-circle">${checkedCount}/${needed.length}</div><div><h3>${checkedCount === needed.length && needed.length ? 'All picked up. Nice work.' : `${needed.length - checkedCount} items to pick up`}</h3><p>From ${plan.length} planned meal${plan.length === 1 ? '' : 's'}${pantry.length ? ` · ${pantry.length} already in your kitchen` : ''}</p></div><span class="pill">${plan.reduce((total, entry) => total + entry.servings, 0)} servings</span></div>${[...grouped].map(([category, items]) => `<section class="shopping-group"><h2 class="shopping-group-title">${esc(category)}<span>${items.length} item${items.length === 1 ? '' : 's'}</span></h2>${items.map(row => shoppingRow(row)).join('')}</section>`).join('')}${pantry.length ? `<details class="pantry-section"><summary>Already in your kitchen (${pantry.length})</summary><div style="margin-top:12px">${pantry.map(row => shoppingRow(row, true)).join('')}</div></details>` : ''}` : emptyState('A good list starts with a good plan.', 'Choose a few meals for the week. Your combined grocery list will appear right here.', 'basket', 'Choose your meals', 'choose-meals')}<form class="manual-form" id="manual-form"><label class="sr-only" for="manual-name" hidden>Extra shopping item</label><input id="manual-name" name="name" placeholder="Anything else? Coffee, napkins…" required maxlength="120" aria-label="Extra shopping item"><input id="manual-amount" name="amount" placeholder="Amount" maxlength="40" aria-label="Amount, optional"><button class="button secondary" type="submit">${icon('plus', 15)} Add extra</button></form>${rows.length ? '<p class="shopping-footnote">Tap the box as you shop, or “Have it” for ingredients already at home. Changed quantities become unchecked again. Compatible units are combined; package sizes and unmatched amounts stay separate. Check package labels when buying.</p>' : ''}${checkedCount ? '<button class="text-button" data-action="uncheck-all">Uncheck shopping items</button>' : ''}`;
}
function shoppingRow(row, pantry = false) {
  const shop = getShoppingState(), checked = shop.checked[row.id] === fingerprint(row);
  const amount = row.quantity === null ? (row.note || 'Amount not specified') : `${formatAmount(row.quantity, row.unit)}${row.packageSize ? ` · ${row.packageSize} each` : ''}`;
  return `<div class="shopping-row ${checked && !pantry ? 'is-checked' : ''}"><button class="check-button" data-action="${pantry ? 'pantry' : 'check-item'}" data-id="${esc(row.id)}" aria-label="${pantry ? 'Move to shopping list' : checked ? 'Uncheck' : 'Check off'} ${esc(row.name)}" ${!pantry ? `aria-pressed="${checked}"` : ''}>${checked && !pantry ? icon('check', 15) : ''}</button><div><div class="item-name">${esc(row.name)}${row.uncertain ? '<span class="quantity-warning">Check amount</span>' : ''}</div><div class="item-amount">${esc(amount)}</div>${row.note && row.quantity !== null ? `<div class="item-note">${esc(row.note)}</div>` : ''}${row.contributions?.length ? `<details class="grocery-source"><summary>Used in ${row.contributions.length} meal${row.contributions.length === 1 ? '' : 's'}</summary><ul>${row.contributions.map(item => `<li>${esc(item.recipeTitle)} · ${item.servings} servings${item.quantity !== null ? ` · ${esc(formatAmount(item.quantity, item.unit))}` : ''}</li>`).join('')}</ul></details>` : ''}</div><div class="row-actions"><button class="pantry-button" data-action="pantry" data-id="${esc(row.id)}">${pantry ? 'Need it' : 'Have it'}</button>${row.manual ? `<button class="pantry-button" data-action="remove-manual" data-id="${esc(row.id)}" aria-label="Remove ${esc(row.name)}">${icon('close', 13)}</button>` : ''}</div></div>`;
}
function settingsView() {
  return `<div class="page-intro"><div class="eyebrow">A kitchen of your own</div><h1>Keep the good recipes.</h1><p>Bring your collection, set your table, and keep a backup for another day.</p></div><div class="notice"><strong>About the recipe collection.</strong> Weektable includes ${bundled.filter(recipe => recipe.source.kind === 'original').length} original starters and ${bundled.filter(recipe => recipe.source.kind !== 'original').length} recipes from credited sources. Open a recipe for its source, reuse details, and original reader rating when available. Mealime’s complete library is not included. Add more recipes through the import button or by hand.</div><div class="settings-grid"><section class="settings-card"><div class="settings-icon">${icon('upload', 23)}</div><h2>Bring your recipes.</h2><p>Import Weektable JSON, Schema.org Recipe JSON, or saved HTML containing recipe data. Files are read on this device. They are not uploaded to a server.</p><button class="button" data-action="import">${icon('upload', 16)} Choose recipe files</button><div class="settings-actions"><button class="text-button" data-action="new-recipe">${icon('plus', 14)} Write down a recipe</button></div><p style="margin:13px 0 0;font-size:10px">PDFs, images and ordinary HTML without structured recipe data need manual entry. The recipe’s original serving count is required for accurate scaling.</p>${ui.importResult ? `<div class="import-result" role="status">${esc(ui.importResult)}</div>` : ''}</section><section class="settings-card"><div class="settings-icon">${icon('download', 23)}</div><h2>A little peace of mind.</h2><p>A backup keeps your recipes, favourites, every weekly plan, and shopping progress together. Save it somewhere you trust before clearing browser data or switching phones.</p><button class="button secondary" data-action="backup">${icon('download', 16)} Export full backup</button><div class="settings-actions"><button class="text-button" data-action="restore">${icon('upload', 14)} Restore a backup</button></div><div class="storage-summary">${state.lastBackup ? `Last backup: ${esc(new Date(state.lastBackup).toLocaleString())}` : 'No backup exported yet.'}</div></section><section class="settings-card"><div class="settings-icon">${icon('people', 23)}</div><h2>Set your table.</h2><p>Choose the default serving count for new meals. You can change it for every meal in your plan.</p><div class="settings-row"><span>Default servings</span>${servingButtons(state.defaultServings, 'default-servings')}</div><div class="settings-row"><span>Included recipes</span><strong>${bundled.length}</strong></div><div class="settings-row"><span>Your imported recipes</span><strong>${state.imports.length}</strong></div><div class="settings-row"><span>Saved favourites</span><strong>${state.favorites.length}</strong></div></section><section class="settings-card"><div class="settings-icon">${icon('phone', 23)}</div><h2>At home on your iPhone.</h2><p>Open your hosted Weektable address in Safari, then add it to your Home Screen for an app-like kitchen companion.</p><ol><li>Tap Safari’s Share button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Open Weektable once while online.</li></ol><div class="offline-status"><span class="status-dot ${navigator.onLine ? '' : 'offline'}"></span>${esc(ui.offline)}</div><p style="margin-top:12px;margin-bottom:0;font-size:10px">The app and included recipes can work offline after loading. Imported recipes and plans stay in this browser. External recipe photos may still need internet access.</p></section><section class="settings-card wide"><div class="settings-icon">${icon('shield', 23)}</div><h2>Your collection stays with you.</h2><p>Weektable needs no login, subscription, or recipe service to calculate your plan. Your changes live in this device’s browser storage, so they are not automatically synced to other devices. Safari may remove website data when storage is low; regular exported backups remain the dependable way to preserve your collection.</p><div class="settings-actions"><button class="button secondary" data-action="persist-storage">${icon('shield', 16)} Request persistent storage</button><a class="button secondary" href="https://www.mealime.com/recipes" target="_blank" rel="noopener noreferrer">Visit Mealime recipes ${icon('arrow', 15)}</a></div><p style="margin-top:17px;margin-bottom:0;font-size:10px">Amounts scale from the recipe’s stated servings, or use an exact serving variant when provided. Cooking times, oven temperatures and numbers inside instructions do not multiply automatically. Food allergies and substitutions need your own review.</p></section></div>`;
}
function emptyState(title, message, symbol, actionLabel, action) { return `<section class="empty-state"><div class="empty-icon">${icon(symbol, 29)}</div><h2>${title}</h2><p>${message}</p><button class="button" data-action="${action}">${actionLabel} ${icon('arrow', 15)}</button></section>`; }
function showRecipe(id, servings = state.defaultServings, day = null) {
  previousFocus = document.activeElement;
  ui.modal = { type: 'recipe', id, servings, day: day || ui.addDay || DAYS[Math.min(currentPlan().length, 6)], done: [] };
  renderModal();
}
function renderModal() {
  const oldScroll = modalRoot.querySelector('.modal')?.scrollTop || 0;
  if (!ui.modal) { modalRoot.innerHTML = ''; document.body.style.overflow = ''; previousFocus?.focus?.({ preventScroll: true }); return; }
  document.body.style.overflow = 'hidden';
  const modal = ui.modal;
  if (modal.type === 'recipe') {
    const recipe = findRecipe(modal.id); if (!recipe) { closeModal(); return; }
    const scaled = scaleRecipe(recipe, modal.servings), favorite = state.favorites.includes(recipe.id);
    modalRoot.innerHTML = `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="recipe-title" tabindex="-1"><button class="modal-close" data-action="close-modal" aria-label="Close recipe">${icon('close', 19)}</button><div class="recipe-detail-art">${recipeArt(recipe, true)}</div><div class="recipe-detail-content"><div class="eyebrow">${recipe.source.kind === 'original' ? 'A Weektable original' : esc(recipe.source.name)}</div><div class="recipe-detail-header"><h2 id="recipe-title">${esc(recipe.title)}</h2><button class="favorite-button ${favorite ? 'is-favorite' : ''}" data-action="favorite" data-id="${esc(recipe.id)}" aria-label="${favorite ? 'Remove from' : 'Add to'} favourites" aria-pressed="${favorite}">${icon('heart', 18)}</button></div><p class="recipe-detail-description">${esc(recipe.description)}</p><div class="detail-meta"><span>${icon('clock', 15)}${scaled.minutes ? `${scaled.minutes} minutes` : 'Time not listed'}</span><span>${icon('people', 15)}${modal.servings} servings</span>${recipe.tags.slice(0, 3).map(tag => `<span class="pill">${esc(tag)}</span>`).join('')}</div>${ratingMarkup(recipe, true)}<div class="recipe-detail-toolbar"><div class="detail-serving"><span>Set your table</span>${servingButtons(modal.servings, 'modal-servings')}</div><div class="detail-add"><select id="modal-day" aria-label="Day for this meal">${DAYS.map(day => `<option ${day === modal.day ? 'selected' : ''}>${day}</option>`).join('')}</select><button class="button" data-action="modal-add">${icon('plus', 15)} Add to week</button></div></div><div class="scaling-note">${scaled.scalingMode === 'exact' ? `Ingredients shown for the recipe’s exact ${modal.servings}-serving version.` : `Ingredients scaled from ${scaled.baseServings} to ${modal.servings} servings. Check pan size and cook in batches when needed. Cooking times, temperatures and quantities written inside steps stay as originally written.`}</div><div class="recipe-columns"><section><h3>What you’ll need</h3><ul class="ingredient-list">${scaled.ingredients.map(item => `<li><span class="amount">${item.quantity === null ? 'To taste / check' : esc(formatAmount(item.quantity, item.unit))}</span><span class="ingredient-name">${esc(item.name)}${item.packageSize ? `<span class="ingredient-note">${esc(item.packageSize)} per package</span>` : ''}${item.preparation ? `<span class="ingredient-note">${esc(item.preparation)}</span>` : ''}${item.note ? `<span class="ingredient-note">${esc(item.note)}</span>` : ''}</span></li>`).join('')}</ul></section><section><h3>Let’s make it.</h3><ol class="steps-list">${scaled.steps.map((step, index) => `<li class="${modal.done.includes(index) ? 'done' : ''}"><button class="step-button" data-action="step-done" data-index="${index}" aria-label="${modal.done.includes(index) ? 'Uncheck' : 'Complete'} step ${index + 1}" aria-pressed="${modal.done.includes(index)}">${modal.done.includes(index) ? icon('check', 14) : index + 1}</button><p>${esc(step)}</p></li>`).join('')}</ol></section></div>${sourceFootnote(recipe)}${isPersonalRecipe(recipe) ? `<div class="modal-footer"><button class="button secondary" data-action="edit-recipe" data-id="${esc(recipe.id)}">${icon('edit', 15)} Edit recipe</button><button class="text-button" data-action="delete-recipe" data-id="${esc(recipe.id)}">Remove recipe</button></div>` : ''}</div></section></div>`;
  } else if (modal.type === 'editor') {
    const recipe = modal.id ? findRecipe(modal.id) : null;
    modalRoot.innerHTML = `<div class="modal-overlay"><section class="modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" tabindex="-1"><button class="modal-close" data-action="close-modal" aria-label="Close recipe editor">${icon('close', 19)}</button><div class="eyebrow">Your favourites deserve a place</div><h2 id="editor-title">${recipe ? 'A little fine-tuning.' : 'Write down a recipe.'}</h2><p>Start with the recipe’s original quantities and serving count. Weektable will do the scaling when you add it to your plan.</p><form id="recipe-form" class="recipe-form"><div class="form-field"><label for="edit-title">Recipe name</label><input id="edit-title" name="title" required maxlength="200" value="${esc(recipe?.title || '')}"></div><div class="form-row"><div class="form-field"><label for="edit-servings">Original servings</label><input id="edit-servings" name="servings" type="number" min="1" max="100" step="1" required value="${recipe?.servings || 2}"></div><div class="form-field"><label for="edit-minutes">Total minutes, optional</label><input id="edit-minutes" name="minutes" type="number" min="1" max="14400" value="${recipe?.minutes || ''}"></div></div><div class="form-field"><label for="edit-description">A short note, optional</label><input id="edit-description" name="description" maxlength="500" value="${esc(recipe?.description || '')}"></div><div class="form-field"><label for="edit-ingredients">Ingredients · one per line</label><textarea id="edit-ingredients" name="ingredients" required rows="7" placeholder="400 g chicken breast&#10;1 tbsp olive oil&#10;2 cloves garlic&#10;1/2 tsp salt">${esc(recipe?.ingredients.map(ingredientEditText).join('\n') || '')}</textarea><small>Use amounts such as 200 g, 1/2 cup, 2 eggs, or 1 (400 g) can tomatoes. Unrecognised amounts are flagged for review in the shopping list.</small></div><div class="form-field"><label for="edit-steps">Cooking steps · one per line</label><textarea id="edit-steps" name="steps" required rows="6" placeholder="Heat the oven…&#10;Prepare the vegetables…">${esc(recipe?.steps.join('\n') || '')}</textarea></div><div class="form-field"><label for="edit-source">Source URL, optional</label><input id="edit-source" name="source" type="url" placeholder="https://…" value="${esc(recipe?.source.url || '')}"></div>${recipe?.variants && Object.keys(recipe.variants).length ? `<div class="notice" style="margin-bottom:0"><strong>This recipe has exact serving variants.</strong> Title, source and note edits preserve them. If you change the base servings, ingredients or steps, the app needs to scale from your edited base recipe.<label style="display:flex;gap:10px;margin-top:10px;align-items:flex-start"><input type="checkbox" name="replace-variants" value="yes" style="width:18px;min-height:18px;margin-top:3px;flex:none">Allow changed base quantities or steps to replace the saved variants.</label></div>` : ''}<div id="editor-error" role="alert"></div><button class="button" type="submit">${icon('check', 17)} ${recipe ? 'Save changes' : 'Save recipe'}</button></form></section></div>`;
  } else if (modal.type === 'confirm') {
    modalRoot.innerHTML = `<div class="modal-overlay"><section class="modal dialog-modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><h2 id="dialog-title">${esc(modal.title)}</h2><p>${esc(modal.message)}</p><div class="settings-actions"><button class="button ${modal.danger ? 'danger' : ''}" data-action="confirm-yes">${esc(modal.label || 'Continue')}</button><button class="button secondary" data-action="close-modal">Cancel</button></div></section></div>`;
  }
  const dialog = modalRoot.querySelector('.modal');
  dialog.scrollTop = oldScroll;
  dialog.focus({ preventScroll: true });
}
function closeModal() { ui.modal = null; renderModal(); }
function confirmAction(title, message, callback, label = 'Continue', danger = false) {
  previousFocus = document.activeElement;
  ui.modal = { type: 'confirm', title, message, callback, label, danger }; renderModal();
}
function navigate(view) {
  if (!['recipes', 'plan', 'shopping', 'settings'].includes(view)) return;
  ui.view = view; render(); window.scrollTo({ top: 0, behavior: 'instant' });
}
function addMeal(recipeId, servings = state.defaultServings, day = null) {
  const recipe = findRecipe(recipeId); if (!recipe) return;
  const selectedDay = day || ui.addDay || DAYS[Math.min(currentPlan().length, 6)];
  state.plan.push({ id: uid(), recipeId, servings, day: selectedDay, week: ui.week });
  ui.addDay = null;
  persist(); render(); toast(`Added to ${selectedDay} · ${servings} servings`);
}
function exportBackup() {
  state.lastBackup = new Date().toISOString(); persist();
  const payload = { application: 'weektable', schemaVersion: 1, exportedAt: state.lastBackup, state: { ...state, bundledRecipes: bundled } };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `weektable-backup-${new Date().toISOString().slice(0, 10)}.json`);
  render(); toast('Backup downloaded. Keep it somewhere safe.');
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function plainShoppingList() {
  const shop = getShoppingState();
  const rows = shoppingRows().filter(row => shop.pantry[row.id] !== fingerprint(row) && shop.checked[row.id] !== fingerprint(row));
  return `WEEKTABLE · ${weekLabel()}\n\n${shoppingText(rows)}`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Shopping list copied.'); }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.style.cssText = 'position:fixed;top:0;left:-9999px'; document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy'); area.remove();
    if (ok) toast('Shopping list copied.'); else { downloadBlob(new Blob([text], { type: 'text/plain' }), 'weektable-shopping-list.txt'); toast('Your shopping list was downloaded instead.'); }
  }
}
function normalizeSavedState(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.plan) || !Array.isArray(input.imports)) throw new Error('This is not a supported Weektable backup.');
  const clean = freshState();
  clean.defaultServings = [2, 4, 6].includes(input.defaultServings) ? input.defaultServings : 4;
  clean.bundledRecipes = Array.isArray(input.bundledRecipes) ? input.bundledRecipes.map(normalizeRecipe) : null;
  clean.imports = input.imports.map(normalizeRecipe);
  const collection = mergeRecipeCollections(shippedRecipes, clean.bundledRecipes, clean.imports);
  const available = new Set(collection.recipes.map(recipe => recipe.id));
  clean.favorites = Array.isArray(input.favorites) ? input.favorites.filter(id => typeof id === 'string' && available.has(id)) : [];
  clean.plan = input.plan.filter(entry => entry && typeof entry.id === 'string' && available.has(entry.recipeId) && [2, 4, 6].includes(entry.servings) && DAYS.includes(entry.day) && /^\d{4}-\d{2}-\d{2}$/.test(entry.week)).map(entry => ({ id: entry.id, recipeId: entry.recipeId, servings: entry.servings, day: entry.day, week: entry.week }));
  if (input.shopping && typeof input.shopping === 'object') {
    for (const [week, shop] of Object.entries(input.shopping)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !shop || typeof shop !== 'object') continue;
      const cleanMap = source => Object.fromEntries(Object.entries(source && typeof source === 'object' ? source : {}).filter(([key, value]) => key.length < 1000 && typeof value === 'string').slice(0, 20000));
      clean.shopping[week] = { checked: cleanMap(shop.checked), pantry: cleanMap(shop.pantry), manual: Array.isArray(shop.manual) ? shop.manual.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({ id: item.id, name: item.name, quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0 ? item.quantity : null, unit: String(item.unit || ''), note: String(item.note || '') })).slice(0, 1000) : [] };
    }
  }
  clean.lastBackup = typeof input.lastBackup === 'string' ? input.lastBackup : null;
  return clean;
}
async function importFiles(files) {
  let count = 0, skipped = 0;
  const warnings = [], ids = new Set(recipes.map(recipe => recipe.id));
  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) { warnings.push(`${file.name}: file exceeds 50 MB. Split it into smaller batches.`); continue; }
    try {
      const text = await file.text();
      const result = parseRecipeImport(text, file.name);
      warnings.push(...result.warnings.map(message => `${file.name}: ${message}`));
      for (const incoming of result.recipes) {
        let recipe = normalizeRecipe(incoming);
        const existing = recipes.find(item => item.id === recipe.id);
        // A corrected method, serving count or source variant is a new record,
        // even when its title and ingredients match an earlier import.
        const content = record => {
          const { id: ignoredId, ...normalized } = normalizeRecipe(record);
          const { kind: ignoredKind, ...source } = normalized.source;
          return JSON.stringify({ ...normalized, source });
        };
        if (existing && content(existing) === content(recipe)) { skipped++; continue; }
        let id = recipe.id; while (ids.has(id)) id = `${recipe.id}-${uid().slice(0, 8)}`;
        recipe = { ...recipe, id, source: { ...recipe.source, kind: 'imported' } };
        ids.add(id); state.imports.push(recipe); recipes.push(recipe); count++;
      }
    } catch (error) { warnings.push(`${file.name}: ${error.message}`); }
  }
  ui.importResult = `${count} recipe${count === 1 ? '' : 's'} imported.${skipped ? ` ${skipped} unchanged duplicate${skipped === 1 ? '' : 's'} skipped.` : ''}${warnings.length ? `\n\nPlease review:\n${warnings.join('\n')}` : ''}`;
  persist(); render(); toast(count ? `${count} recipes added to your kitchen.` : 'No recipes added. See the import details.');
}
function openEditor(id = null) { previousFocus = document.activeElement; ui.modal = { type: 'editor', id }; renderModal(); }

document.addEventListener('click', async event => {
  if (event.target === modalRoot.querySelector('.modal-overlay')) { closeModal(); return; }
  const button = event.target.closest('[data-action]'); if (!button) return;
  event.preventDefault();
  const { action, id, value } = button.dataset;
  try {
    if (action === 'navigate') navigate(button.dataset.view);
    else if (action === 'filter') { ui.filter = button.dataset.filter; ui.visible = 24; render(); }
    else if (action === 'reset-filters') { ui.filter = 'all'; ui.search = ''; render(); }
    else if (action === 'more-recipes') { ui.visible += 24; render(); }
    else if (action === 'favorite') { state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id]; persist(); render(); if (ui.modal?.type === 'recipe') renderModal(); }
    else if (action === 'open-recipe') showRecipe(id);
    else if (action === 'open-entry') { const entry = state.plan.find(item => item.id === id); if (entry) showRecipe(entry.recipeId, entry.servings, entry.day); }
    else if (action === 'quick-add') addMeal(id);
    else if (action === 'modal-add') { if (ui.modal?.type === 'recipe') addMeal(ui.modal.id, ui.modal.servings, ui.modal.day); }
    else if (action === 'modal-servings') { ui.modal.servings = Number(value); renderModal(); }
    else if (action === 'plan-servings') { const entry = state.plan.find(item => item.id === id); if (entry) { entry.servings = Number(value); persist(); render(); } }
    else if (action === 'default-servings') { state.defaultServings = Number(value); persist(); render(); toast(`New meals will serve ${value}.`); }
    else if (action === 'week') { ui.week = shiftWeek(ui.week, Number(button.dataset.delta)); ui.addDay = null; render(); }
    else if (action === 'today') { ui.week = getWeekStart(); render(); }
    else if (action === 'add-day') { ui.addDay = button.dataset.day; ui.filter = 'all'; ui.search = ''; navigate('recipes'); toast(`Choose a meal for ${ui.addDay}.`); }
    else if (action === 'remove-entry') { state.plan = state.plan.filter(item => item.id !== id); persist(); render(); toast('Meal removed from this week.'); }
    else if (action === 'duplicate-entry') { const entry = state.plan.find(item => item.id === id); if (entry) addMeal(entry.recipeId, entry.servings, DAYS[Math.min(DAYS.indexOf(entry.day) + 1, 6)]); }
    else if (action === 'clear-week') confirmAction('Start this week fresh?', 'This removes the meals planned for the selected week. Your recipes and other weeks are kept.', () => { state.plan = state.plan.filter(entry => entry.week !== ui.week); persist(); render(); toast('This week’s plan is clear.'); }, 'Clear this week', true);
    else if (action === 'choose-meals') navigate('recipes');
    else if (action === 'check-item' || action === 'pantry') {
      const row = shoppingRows().find(item => item.id === id); if (!row) return;
      const map = getShoppingState()[action === 'pantry' ? 'pantry' : 'checked'];
      if (map[id] === fingerprint(row)) delete map[id]; else map[id] = fingerprint(row);
      persist(); render();
    } else if (action === 'remove-manual') { const shop = getShoppingState(); shop.manual = shop.manual.filter(item => item.id !== id); persist(); render(); }
    else if (action === 'uncheck-all') { getShoppingState().checked = {}; persist(); render(); }
    else if (action === 'copy-shopping') await copyText(plainShoppingList());
    else if (action === 'share-shopping') { if (navigator.share) { try { await navigator.share({ title: 'Weektable shopping list', text: plainShoppingList() }); } catch (error) { if (error.name !== 'AbortError') await copyText(plainShoppingList()); } } else await copyText(plainShoppingList()); }
    else if (action === 'print') window.print();
    else if (action === 'close-modal') closeModal();
    else if (action === 'step-done') { const index = Number(button.dataset.index); ui.modal.done = ui.modal.done.includes(index) ? ui.modal.done.filter(item => item !== index) : [...ui.modal.done, index]; renderModal(); }
    else if (action === 'import') document.querySelector('#import-files').click();
    else if (action === 'backup') exportBackup();
    else if (action === 'restore') document.querySelector('#restore-file').click();
    else if (action === 'new-recipe') openEditor();
    else if (action === 'edit-recipe') openEditor(id);
    else if (action === 'delete-recipe') {
      const recipe = findRecipe(id);
      const included = shippedRecipes.some(item => item.id === id);
      confirmAction(included ? 'Remove your saved copy?' : 'Remove this recipe?', included ? `Your imported version of “${recipe.title}” and its planned meals will be removed. The app’s included version will remain available. Export a backup first to keep your saved version.` : `“${recipe.title}” will be removed from your collection and every weekly plan. Export a backup first if you want to keep a copy.`, () => { state.imports = state.imports.filter(item => item.id !== id); state.plan = state.plan.filter(item => item.recipeId !== id); state.favorites = state.favorites.filter(item => item !== id); rebuildRecipes(); persist(); render(); toast(included ? 'Your saved copy was removed. The included recipe is available.' : 'Recipe removed.'); }, included ? 'Remove saved copy' : 'Remove recipe', true);
    } else if (action === 'confirm-yes') { const callback = ui.modal?.callback; closeModal(); callback?.(); }
    else if (action === 'persist-storage') { const granted = await requestPersistentStorage(); toast(granted ? 'Persistent storage granted. Keep exporting backups too.' : 'Your browser manages storage automatically. Keep regular backups.'); }
  } catch (error) { console.error(error); toast(error.message || 'Something went wrong. Please try again.'); }
});

document.addEventListener('input', event => {
  if (event.target.id === 'recipe-search') { ui.search = event.target.value; ui.visible = 24; render(); }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'modal-day' && ui.modal) ui.modal.day = event.target.value;
  if (event.target.classList.contains('move-day')) {
    const entry = state.plan.find(item => item.id === event.target.dataset.entry);
    if (entry && DAYS.includes(event.target.value)) { entry.day = event.target.value; persist(); render(); }
  }
  if (event.target.id === 'import-files') { await importFiles([...event.target.files]); event.target.value = ''; }
  if (event.target.id === 'restore-file') {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.application !== 'weektable' || data.schemaVersion !== 1) throw new Error('Choose a Weektable full backup JSON file. Recipe files use Import instead.');
      // Also accept an early v1 backup with the snapshot at the top level.
      const restored = normalizeSavedState({ ...data.state, bundledRecipes: data.state?.bundledRecipes ?? data.bundledRecipes ?? null });
      confirmAction('Restore your kitchen?', `This replaces this device’s current recipes, plans and shopping progress with ${restored.imports.length} imported recipes and ${restored.plan.length} planned meals from the backup. Export your current backup first if you need it.`, () => { state = restored; rebuildRecipes(); persist(); render(); toast('Your kitchen has been restored.'); }, 'Restore backup');
    } catch (error) { toast(error.message); }
  }
});

document.addEventListener('submit', event => {
  if (event.target.id === 'manual-form') {
    event.preventDefault();
    const data = new FormData(event.target), name = String(data.get('name') || '').trim(), amount = String(data.get('amount') || '').trim();
    if (!name) return;
    const parsed = amount ? parseIngredient(`${amount} ${name}`) : { quantity: null, unit: '', note: '' };
    // Do not discard an unrecognised package unit by replacing the parsed name
    // with the free-form item name ("2 packs coffee" must retain "packs").
    const unambiguous = amount && parsed.name?.toLowerCase() === name.toLowerCase();
    getShoppingState().manual.push({ id: `manual-${uid()}`, name, quantity: unambiguous ? parsed.quantity : null, unit: unambiguous ? parsed.unit || '' : '', note: amount && (!unambiguous || parsed.quantity === null) ? amount : '' });
    persist(); render(); toast('Extra added to the list.');
  }
  if (event.target.id === 'recipe-form') {
    event.preventDefault();
    try {
      const form = new FormData(event.target), editId = ui.modal?.id;
      const ingredientLines = String(form.get('ingredients')).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const steps = String(form.get('steps')).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const sourceUrl = String(form.get('source') || '').trim();
      if (sourceUrl && !safeLink(sourceUrl)) throw new Error('The source URL must start with http:// or https://.');
      const existing = editId ? findRecipe(editId) : null;
      const originalLines = existing?.ingredients.map(ingredientEditText) || [];
      const sameIngredients = JSON.stringify(ingredientLines) === JSON.stringify(originalLines);
      const baseChanged = existing && (Number(form.get('servings')) !== existing.servings || !sameIngredients || JSON.stringify(steps) !== JSON.stringify(existing.steps));
      if (baseChanged && existing.variants && Object.keys(existing.variants).length && form.get('replace-variants') !== 'yes') {
        throw new Error('This recipe has exact serving variants. To change the base ingredients, servings or steps, check the box allowing those variants to be replaced by linear scaling, then save again.');
      }
      const reusableLines = new Map();
      originalLines.forEach((line, index) => {
        if (!reusableLines.has(line)) reusableLines.set(line, []);
        reusableLines.get(line).push(existing.ingredients[index]);
      });
      const ingredientData = ingredientLines.map(line => {
        const matches = reusableLines.get(line);
        return matches?.length ? matches.shift() : parseIngredient(line);
      });
      const recipeInput = { ...(existing || {}), id: editId || `personal-${uid()}`, title: String(form.get('title')).trim(), description: String(form.get('description') || '').trim(), servings: Number(form.get('servings')), minutes: form.get('minutes') ? Number(form.get('minutes')) : null, tags: existing?.tags || ['Personal recipe'], category: existing?.category || 'Dinner', ingredients: ingredientData, steps, source: { ...(existing?.source || {}), name: existing?.source.name || 'Your saved recipe', url: sourceUrl, kind: 'imported' } };
      if (baseChanged) {
        delete recipeInput.variants;
        const note = 'Ingredients, servings or instructions edited locally; source ratings still refer to the original recipe.';
        if (recipeInput.rating && !recipeInput.source.adaptations?.includes(note)) recipeInput.source.adaptations = [recipeInput.source.adaptations, note].filter(Boolean).join(' ');
      }
      const recipe = normalizeRecipe(recipeInput);
      if (editId) state.imports = state.imports.map(item => item.id === editId ? recipe : item); else state.imports.push(recipe);
      rebuildRecipes(); persist(); closeModal(); render(); toast(editId ? 'Recipe updated.' : 'Recipe saved to your kitchen.');
    } catch (error) { document.querySelector('#editor-error').innerHTML = `<div class="form-error">${esc(error.message)}</div>`; }
  }
});

document.addEventListener('keydown', event => {
  if (!ui.modal) return;
  if (event.key === 'Escape') closeModal();
  if (event.key === 'Tab') {
    const dialog = modalRoot.querySelector('.modal'), controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener('online', () => render());
window.addEventListener('offline', () => render());
async function start() {
  try {
    const response = await fetch('./data/recipes.json');
    if (!response.ok) throw new Error(`Recipe data could not load (HTTP ${response.status}).`);
    const data = await response.json();
    shippedRecipes = data.recipes.map(normalizeRecipe);
    bundled = shippedRecipes;
    try {
      let saved = await readState();
      // Migrate the early localStorage format when present, then keep larger
      // recipe collections in IndexedDB rather than a 5 MB string snapshot.
      if (!saved) {
        const legacy = localStorage.getItem(KEY);
        if (legacy) { saved = JSON.parse(legacy); await writeState(saved); localStorage.removeItem(KEY); }
      }
      if (saved) state = normalizeSavedState(saved);
    }
    catch { ui.storageWarning = 'The saved browser data could not be read. Your original recipes are available; restore a backup to recover your saved kitchen.'; }
    const added = rebuildRecipes(); render();
    if (added) { persist(); toast(`${added} new included recipe${added === 1 ? '' : 's'} added. Your saved recipe versions are unchanged.`); }
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        ui.offline = 'App ready for offline use on this device.';
      } catch { ui.offline = 'Offline setup was unavailable. Reload while online to try again.'; }
    } else ui.offline = 'Offline support needs an HTTPS address or localhost.';
    if (ui.view === 'settings') render();
  } catch (error) {
    app.innerHTML = `<div class="error-shell"><h1>Let’s get your kitchen ready.</h1><p>Weektable needs to be opened through a web server, such as GitHub Pages or the included local preview command. Opening index.html directly from a file will not load its recipe data.</p><pre>${esc(error.message)}</pre><p>See README.md in your repository for the quick setup steps.</p><button class="button" onclick="location.reload()">Try again</button></div>`;
  }
}
start();
