import { cardHTML, icon, ICONS } from './lib/templates.js';

const $ = id => document.getElementById(id);
const el = { grid: $('grid'), count: $('count'), pager: $('pager'), state: $('state'), q: $('q'), box: $('searchBox'), sort: $('sort'), clear: $('clear'), chips: $('chips') };
const PAGE_SIZE = +el.grid.dataset.pageSize || 9;
const DEBOUNCE = 180;
const SORTS = {
  new: (a, b) => b.t - a.t || a.i - b.i,
  old: (a, b) => a.t - b.t || a.i - b.i,
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { all: [], view: [], q: '', tag: '', sort: 'new', page: 1 };
let ctrl = null;

const safeHref = u => { try { return /^https?:$/.test(new URL(u, location.href).protocol) ? u : '#'; } catch { return '#'; } };
const pluralize = n => `${n.toLocaleString()} ${n === 1 ? 'post' : 'posts'}`;

/* ---------- Data ---------- */
const normalize = raw => (Array.isArray(raw) ? raw : []).filter(p => p && p.title && p.link).map((p, i) => {
  const t = Date.parse(`${p.published}T00:00:00Z`);
  const tags = Array.isArray(p.tags) ? p.tags.map(String) : [];
  return {
    ...p, i, tags, t: Number.isNaN(t) ? 0 : t, link: safeHref(String(p.link)),
    title: String(p.title), description: String(p.description ?? ''), thumbnail: p.thumbnail || '',
    key: `${p.title} ${p.description ?? ''} ${p.section ?? ''} ${tags.join(' ')}`.toLowerCase()
  };
});

async function load() {
  ctrl?.abort();
  ctrl = new AbortController();
  if (!el.grid.children.length) showSkeleton(); // the server-rendered first page stays visible while this loads
  el.state.replaceChildren();
  try {
    const res = await fetch('/blogs.json', { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.all = normalize(await res.json());
    renderChips();
    apply(false);
  } catch (err) {
    if (err.name !== 'AbortError') showError();
  }
}

/* ---------- URL <-> state ---------- */
function readURL() {
  const p = new URLSearchParams(location.search);
  state.q = (p.get('q') || '').slice(0, 100);
  state.tag = (p.get('tag') || '').slice(0, 60);
  state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'new';
  state.page = Math.max(1, parseInt(p.get('page'), 10) || 1);
  el.q.value = state.q;
  el.sort.value = state.sort;
  el.box.classList.toggle('has-value', !!state.q);
}

function writeURL(push) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.tag) p.set('tag', state.tag);
  if (state.sort !== 'new') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', state.page);
  const qs = p.toString();
  history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + (qs ? `?${qs}` : '') + location.hash);
}

function apply(resetPage = true) {
  const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
  const tag = state.tag.toLowerCase();
  const list = state.all.filter(p => (!tag || p.tags.some(t => t.toLowerCase() === tag)) && terms.every(t => p.key.includes(t)));
  list.sort(SORTS[state.sort]);
  state.view = list;
  if (resetPage) state.page = 1;
  render();
}

/* ---------- Render ---------- */
const totalPages = () => Math.max(1, Math.ceil(state.view.length / PAGE_SIZE));

function render() {
  const total = totalPages();
  state.page = Math.min(state.page, total);
  const start = (state.page - 1) * PAGE_SIZE;
  const items = state.view.slice(start, start + PAGE_SIZE);
  const filtered = state.q || state.tag;

  el.count.textContent = filtered ? `${pluralize(state.view.length)} for “${[state.q, state.tag && `#${state.tag}`].filter(Boolean).join(' ')}”` : pluralize(state.view.length);
  const base = document.title.replace(/^Page \d+ – /, '');
  document.title = state.page > 1 ? `Page ${state.page} – ${base}` : base;

  const lead = state.page === 1 && !filtered && state.sort === 'new';
  el.grid.innerHTML = items.map((p, i) => cardHTML(p, { feature: lead && i === 0, eager: i < 2 })).join('');
  el.grid.removeAttribute('aria-busy');
  el.state.replaceChildren();
  if (!items.length) showEmpty();
  el.chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.tag || '') === state.tag)));
  renderPager(total);
}

function renderChips() {
  const counts = new Map();
  state.all.forEach(p => p.tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(x => x[0]);
  if (state.tag && !top.includes(state.tag)) top.push(state.tag);
  el.chips.replaceChildren();
  if (!top.length) return;
  for (const t of ['', ...top]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tag = t;
    b.textContent = t || 'All';
    el.chips.append(b);
  }
}

function showSkeleton() {
  el.grid.innerHTML = Array.from({ length: Math.min(PAGE_SIZE, 6) }, () => '<li><div class="card skel"><div class="thumb"></div><div class="card-body"><i></i><i></i><i></i></div></div></li>').join('');
  el.grid.setAttribute('aria-busy', 'true');
  el.count.textContent = 'Loading posts…';
}

function showEmpty() {
  el.state.innerHTML = `<div class="state">${icon(ICONS.search)}<h2>No posts found</h2><p>Try a different search term, or clear the filters to see everything.</p><button class="btn" type="button" id="reset">Clear filters</button></div>`;
}

function showError() {
  el.grid.replaceChildren();
  el.grid.removeAttribute('aria-busy');
  el.count.textContent = '';
  el.state.innerHTML = `<div class="state" role="alert">${icon(ICONS.alert)}<h2>Couldn’t load posts</h2><p>Check your connection and try again.</p><button class="btn" type="button" id="retry">Try again</button></div>`;
}

/* ---------- Pagination ---------- */
function pageItems(cur, total) {
  const keep = [...new Set([1, total, cur - 1, cur, cur + 1])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  keep.forEach((n, i) => {
    const prev = keep[i - 1];
    if (prev) { if (n - prev === 2) out.push(prev + 1); else if (n - prev > 2) out.push('gap'); }
    out.push(n);
  });
  return out;
}

function pageHref(n) {
  const p = new URLSearchParams(location.search);
  n > 1 ? p.set('page', n) : p.delete('page');
  const s = p.toString();
  return location.pathname + (s ? `?${s}` : '');
}

function renderPager(total) {
  if (total <= 1) { el.pager.hidden = true; el.pager.replaceChildren(); return; }
  const cur = state.page;
  const arrow = (dir, target, label) => {
    const ic = icon(dir < 0 ? ICONS.prev : ICONS.next);
    return target < 1 || target > total
      ? `<span class="pg" aria-disabled="true" aria-label="${label}">${ic}</span>`
      : `<a class="pg" href="${pageHref(target)}" data-page="${target}" aria-label="${label}" rel="${dir < 0 ? 'prev' : 'next'}">${ic}</a>`;
  };
  const items = pageItems(cur, total).map(n => `<li>${n === 'gap'
    ? '<span class="gap" aria-hidden="true">…</span>'
    : `<a class="pg" href="${pageHref(n)}" data-page="${n}" aria-label="Page ${n}"${n === cur ? ' aria-current="page"' : ''}>${n}</a>`}</li>`).join('');
  el.pager.innerHTML = `${arrow(-1, cur - 1, 'Previous page')}<ol>${items}</ol><span class="status">Page ${cur} of ${total}</span>${arrow(1, cur + 1, 'Next page')}`;
  el.pager.hidden = false;
}

function goTo(n) {
  if (n === state.page) return;
  state.page = n;
  writeURL(true);
  render();
  el.count.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  el.count.focus({ preventScroll: true });
}

/* ---------- Events ---------- */
el.pager.addEventListener('click', e => {
  const a = e.target.closest('a[data-page]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
  e.preventDefault();
  goTo(+a.dataset.page);
});

el.chips.addEventListener('click', e => {
  const b = e.target.closest('button[data-tag]');
  if (!b) return;
  state.tag = b.dataset.tag;
  apply(true);
  writeURL(true);
});

el.state.addEventListener('click', e => {
  if (e.target.id === 'retry') load();
  if (e.target.id === 'reset') {
    el.q.value = '';
    state.tag = '';
    onSearch();
    el.q.focus();
  }
});

// Broken thumbnails fall back to the gradient placeholder (error events don't bubble, so capture)
el.grid.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.closest('.thumb')?.classList.add('noimg'); }, true);

let timer;
function onSearch() {
  state.q = el.q.value.trim().replace(/\s+/g, ' ');
  el.box.classList.toggle('has-value', !!el.q.value);
  clearTimeout(timer);
  timer = setTimeout(() => { apply(true); writeURL(false); }, DEBOUNCE);
}
el.q.addEventListener('input', onSearch);
el.clear.addEventListener('click', () => { el.q.value = ''; onSearch(); el.q.focus(); });
$('tools').addEventListener('submit', e => e.preventDefault());
el.sort.addEventListener('change', () => { state.sort = el.sort.value; apply(true); writeURL(false); });
addEventListener('popstate', () => { readURL(); if (state.all.length) apply(false); });

readURL();
load();
