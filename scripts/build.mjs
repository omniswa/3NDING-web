#!/usr/bin/env node
/* Builds the static site from content/posts/**.md. Zero dependencies, Node 18+.
   Writes: index.html, 404.html, blogs/**, blogs.json, sitemap.xml, feed.xml, robots.txt */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, esc } from '../js/lib/markdown.js';
import { normalize, validate, toListing } from '../js/lib/post.js';
import { postPage, homePage, notFoundPage } from '../js/lib/templates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const at = (...p) => path.join(ROOT, ...p);
const site = JSON.parse(await readFile(at('site.config.json'), 'utf8'));

async function walk(dir, ext) {
  let out = [];
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out.sort();
}
const put = async (rel, text) => { await mkdir(path.dirname(at(rel)), { recursive: true }); await writeFile(at(rel), text); };

/* Cache-busting version from the CSS and JS contents */
const h = createHash('sha1');
for (const f of [...await walk(at('css'), '.css'), ...await walk(at('js'), '.js')]) h.update(await readFile(f));
const v = h.digest('hex').slice(0, 8);

/* Read + validate every post before writing anything */
const posts = [], errors = [], seen = new Map();
for (const file of await walk(at('content', 'posts'), '.md')) {
  const rel = path.relative(ROOT, file);
  const { data, body } = parseFrontMatter(await readFile(file, 'utf8'));
  const post = normalize(data, body, site, path.basename(file, '.md'));
  const r = validate(post, site);
  r.errors.forEach(m => errors.push(`${rel}: ${m}`));
  r.warnings.forEach(m => console.warn(`! ${rel}: ${m}`));
  if (seen.has(post.link)) errors.push(`${rel}: ${post.link} is already used by ${seen.get(post.link)}`);
  seen.set(post.link, rel);
  if (post.draft) { console.log(`- draft skipped: ${rel}`); continue; }
  posts.push(post);
}
if (errors.length) { console.error(errors.map(m => 'x ' + m).join('\n') + '\n\nBuild stopped. Nothing was written.'); process.exit(1); }

posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const listing = posts.map(toListing);

/* Pages */
await rm(at('blogs'), { recursive: true, force: true }); // blogs/ is generated output
// "Previous" is the next-older post, "Next" is the next-newer one
await Promise.all(posts.map((p, i) => {
  const related = posts.filter(o => o !== p)
    .map(o => ({ o, s: o.tags.filter(t => p.tags.includes(t)).length }))
    .sort((a, b) => b.s - a.s || b.o.date.localeCompare(a.o.date))
    .slice(0, 3).map(x => toListing(x.o));
  return put(`blogs/${p.year}/${p.slug}.html`, postPage(p, { site, v, prev: listing[i + 1], next: listing[i - 1], related }));
}));
await put('index.html', homePage({ site, v, posts: listing }));
await put('404.html', notFoundPage({ site, v }));
await put('blogs.json', JSON.stringify(listing));

/* SEO files */
const urls = [{ loc: site.domain + '/', lastmod: posts[0]?.date }, ...posts.map(p => ({ loc: p.url, lastmod: p.updated || p.date }))];
await put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);

const rfc = d => new Date(d + 'T00:00:00Z').toUTCString();
await put('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(site.name)}</title>
  <link>${site.domain}/</link>
  <description>${esc(site.description)}</description>
  <language>${site.language}</language>
  <atom:link href="${site.domain}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.slice(0, 20).map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${p.url}</link>
    <guid isPermaLink="true">${p.url}</guid>
    <pubDate>${rfc(p.date)}</pubDate>
    <description>${esc(p.description)}</description>${p.tags.map(t => `\n    <category>${esc(t)}</category>`).join('')}
  </item>`).join('\n')}
</channel>
</rss>
`);
await put('robots.txt', `User-agent: *\nAllow: /\nDisallow: /generator.html\n\nSitemap: ${site.domain}/sitemap.xml\n`);

console.log(`Built ${posts.length} post${posts.length === 1 ? '' : 's'} (assets v${v}).`);
