import { slugify, parseFrontMatter, toFrontMatter } from './lib/markdown.js';
import { normalize, validate, toListing } from './lib/post.js';
import { postPage } from './lib/templates.js';

const site = await (await fetch('/site.config.json')).json();
const $ = id => document.getElementById(id);
const TEXT = ['title', 'slug', 'date', 'updated', 'description', 'lede', 'author', 'section', 'tags', 'image', 'alt', 'caption', 'thumbnail', 'body'];
const F = Object.fromEntries([...TEXT, 'toc', 'draft'].map(k => [k, $(k)]).filter(([, e]) => e));
const DRAFT_KEY = '3nding:draft';
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

let slugTouched = false;
let rootHandle = null;
let published = new Set();
fetch('/blogs.json').then(r => r.json()).then(l => { published = new Set(l.map(p => p.link)); refresh(); }).catch(() => {});

/* ---------- Form <-> data ---------- */
function blank() {
  return { title: '', slug: '', date: today(), updated: '', description: '', lede: '', author: site.defaultAuthor, section: site.defaultSection, tags: '', image: '', alt: '', caption: '', thumbnail: '', body: '', toc: true, draft: false };
}
function read() {
  const v = {};
  for (const k of TEXT) v[k] = F[k]?.value ?? '';
  v.toc = F.toc.checked;
  v.draft = F.draft.checked;
  return v;
}
function write(v) {
  const b = { ...blank(), ...v };
  for (const k of TEXT) if (F[k]) F[k].value = Array.isArray(b[k]) ? b[k].join(', ') : String(b[k] ?? '');
  F.toc.checked = b.toc !== false;
  F.draft.checked = b.draft === true;
  slugTouched = !!(b.slug && b.slug !== slugify(b.title));
}
const model = () => { const v = read(); return normalize(v, v.body, site); };

/* ---------- Checks + preview ---------- */
const preview = $('preview');
let timer, saveTimer, scrollY = 0;

function refresh() {
  const v = read();
  const p = normalize(v, v.body, site);
  const { errors, warnings } = validate(p, site);
  if (published.has(p.link) && !editingExisting) warnings.push(`${p.link} is already published. Saving will replace it.`);
  $('urlHint').textContent = p.slug && p.year ? `${site.domain}${p.link}` : '';
  $('descHint').textContent = `${p.description.length} characters${p.description && (p.description.length < 120 || p.description.length > 160) ? '. Aim for 120–160.' : ''}`;
  $('stats').textContent = `${p.words.toLocaleString()} words, ${p.mins} min read`;
  const items = [...errors.map(m => ['err', m]), ...warnings.map(m => ['warn', m])];
  $('checks').innerHTML = items.length ? items.map(([c, m]) => `<li class="${c}">${m.replace(/</g, '&lt;')}</li>`).join('') : '<li>Everything looks good.</li>';

  clearTimeout(timer);
  timer = setTimeout(() => {
    try { scrollY = preview.contentWindow?.scrollY || 0; } catch {}
    const pv = normalize({ ...v, title: v.title || 'Untitled post', description: v.description || 'Add a description.', date: /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : today() }, v.body, site);
    preview.srcdoc = postPage(pv, { site, v: '', prev: null, next: null, related: [] });
  }, 250);

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {} }, 400);
}

preview.addEventListener('load', () => {
  const d = preview.contentDocument;
  d.addEventListener('click', e => { const a = e.target.closest('a'); if (a && !a.getAttribute('href')?.startsWith('#')) e.preventDefault(); });
  preview.contentWindow.scrollTo(0, scrollY);
});

/* ---------- Events ---------- */
let editingExisting = false;
document.querySelectorAll('input:not([type=file]), textarea').forEach(el => el.addEventListener('input', () => {
  if (el === F.slug) slugTouched = true;
  if (el === F.title && !slugTouched) F.slug.value = slugify(F.title.value);
  refresh();
}));

$('newPost').addEventListener('click', () => {
  if (read().body.trim() && !confirm('Clear the form and start a new post? Unsaved changes will be lost.')) return;
  write(blank());
  editingExisting = false;
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
  say('Started a new post.');
  refresh();
});

$('openFile').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  const { data, body } = parseFrontMatter(await f.text());
  write({ ...data, tags: Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || '', body, slug: data.slug || f.name.replace(/\.md$/, '') });
  editingExisting = true;
  say(`Opened ${f.name}.`);
  refresh();
  e.target.value = '';
});

/* ---------- Output ---------- */
const statusEl = $('status');
function say(msg, err) { statusEl.textContent = msg; statusEl.className = 'show' + (err ? ' err' : ''); }

function ready() {
  const v = read();
  const p = normalize(v, v.body, site);
  const { errors } = validate(p, site);
  if (errors.length) { say(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ''), true); return null; }
  const tags = p.tags;
  return { p, md: toFrontMatter({ ...v, slug: p.slug, tags }, v.body) };
}

$('dlMd').addEventListener('click', () => {
  const r = ready();
  if (!r) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([r.md], { type: 'text/markdown' }));
  a.download = r.p.slug + '.md';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  say(`Downloaded ${r.p.slug}.md. Put it in content/posts/${r.p.year}/ then run npm run build.`);
});

$('copyMd').addEventListener('click', async () => {
  const r = ready();
  if (!r) return;
  try { await navigator.clipboard.writeText(r.md); say('Markdown copied.'); } catch { say('Copy failed. Use Download .md instead.', true); }
});

if (!window.showDirectoryPicker) $('saveFolder').hidden = true;
$('saveFolder').addEventListener('click', async () => {
  const r = ready();
  if (!r) return;
  try {
    rootHandle ||= await showDirectoryPicker({ mode: 'readwrite' });
    let dir = rootHandle;
    for (const part of ['content', 'posts', r.p.year]) dir = await dir.getDirectoryHandle(part, { create: true });
    const name = r.p.slug + '.md';
    const exists = await dir.getFileHandle(name).then(() => true, () => false);
    if (exists && !editingExisting && !confirm(`content/posts/${r.p.year}/${name} already exists. Replace it?`)) return;
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(r.md);
    await w.close();
    editingExisting = true;
    say(`Saved content/posts/${r.p.year}/${name}. Run npm run build to publish.`);
    refresh();
  } catch (e) {
    rootHandle = null;
    if (e.name !== 'AbortError') say('Save failed: ' + e.message, true);
  }
});

/* ---------- Init ---------- */
let restored = false;
try {
  const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (saved?.body || saved?.title) { write(saved); restored = true; }
} catch {}
if (!restored) write(blank());
$('draftInfo').textContent = restored ? 'Restored your last unsaved draft. Use New post to start fresh.' : 'Your work saves in this browser as you type.';
refresh();
