/* Every page's HTML lives here. Used by the build script and by the generator's live preview. */
import { esc } from './markdown.js';

export const formatDate = (iso, long = true) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: long ? 'long' : 'short', day: 'numeric', timeZone: 'UTC' });

const abs = (site, u) => (/^https?:\/\//i.test(u) ? u : site.domain + (u.startsWith('/') ? '' : '/') + u);
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

const THEME_INIT = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})();`;

const BRAND = `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#g)"/><path d="M10 22 22 10M12 10h10v10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>'
};
export const icon = (paths, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

/* ---------- Page shell ---------- */
export function layout({ site, v = '', title, description, canonical = '', robots = 'index, follow, max-image-preview:large', head = '', css = [], js = [], body }) {
  const q = v ? `?v=${v}` : '';
  const links = (site.footerLinks || []).map(l => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join('');
  return `<!doctype html>
<html lang="${esc(site.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ''}<meta name="robots" content="${robots}">
<meta name="theme-color" content="#f6f7fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1016" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="/feed.xml">
${head}
${['base', ...css].map(n => `<link rel="stylesheet" href="/css/${n}.css${q}">`).join('\n')}
<script>${THEME_INIT}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="${esc(site.name)} home">${BRAND}${esc(site.name)}</a>
    <div class="bar-actions">
      <a class="icon-btn" href="/feed.xml" aria-label="RSS feed"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19a1 1 0 1 0 0 .01M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/></svg></a>
      <button class="icon-btn" id="theme" type="button" aria-label="Toggle dark mode">
        <svg class="icon moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>
        <svg class="icon sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
    </div>
  </div>
</header>
${body}
<footer>
  <div class="wrap foot">
    <p>© ${new Date().getFullYear()} ${esc(site.name)}</p>
    <nav class="links" aria-label="Footer">${links}</nav>
  </div>
</footer>
${['site', ...js].map(n => `<script type="module" src="/js/${n}.js${q}"></script>`).join('\n')}
</body>
</html>
`;
}

/* ---------- Post card (home grid, related posts, client-side rendering) ---------- */
export function cardHTML(p, { feature = false, eager = false } = {}) {
  const img = p.thumbnail
    ? `<img src="${esc(p.thumbnail)}" alt="" width="600" height="375" decoding="async" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''}>`
    : '';
  return `<li${feature ? ' class="is-feature"' : ''}><article class="card">
<figure class="thumb${p.thumbnail ? '' : ' noimg'}">${img}</figure>
<div class="card-body">
<div class="meta">${p.section ? `<span class="chip">${esc(p.section)}</span>` : ''}<time datetime="${esc(p.published)}">${formatDate(p.published, false)}</time>${p.readingTime ? `<span>${p.readingTime} min read</span>` : ''}</div>
<h2 class="title"><a href="${esc(p.link)}">${esc(p.title)}</a></h2>
<p class="desc">${esc(p.description)}</p>
</div>
</article></li>`;
}

/* ---------- Home ---------- */
export function homePage({ site, v, posts }) {
  const cards = posts.slice(0, site.pageSize).map((p, i) => cardHTML(p, { feature: i === 0, eager: i < 2 })).join('\n');
  const ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.domain + '/', description: site.description, inLanguage: site.language };
  return layout({
    site, v, title: site.title, description: site.description, canonical: site.domain + '/',
    css: ['cards', 'home'], js: ['home'],
    head: `<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(site.description)}">
<meta property="og:url" content="${site.domain}/">
<script type="application/ld+json">${json(ld)}</script>`,
    body: `<main id="main" class="wrap">
  <section class="hero">
    <h1>${esc(site.heroTitle || site.name)}</h1>
    <p>${esc(site.tagline)}</p>
  </section>
  <form class="toolbar" id="tools" role="search" novalidate>
    <div class="search" id="searchBox">
      ${icon(ICONS.search)}
      <label class="sr" for="q">Search posts</label>
      <input id="q" type="search" placeholder="Search posts" autocomplete="off" enterkeyhint="search" maxlength="100">
      <button class="clear" id="clear" type="button" aria-label="Clear search">${icon(ICONS.close)}</button>
    </div>
    <label class="sr" for="sort">Sort posts</label>
    <select class="sort" id="sort">
      <option value="new">Newest first</option>
      <option value="old">Oldest first</option>
      <option value="title">Title A–Z</option>
    </select>
  </form>
  <div class="chips" id="chips" role="group" aria-label="Filter by tag"></div>
  <p class="count" id="count" tabindex="-1" aria-live="polite">${posts.length} ${posts.length === 1 ? 'post' : 'posts'}</p>
  <ul class="feed" id="grid" data-page-size="${site.pageSize}">
${cards}
  </ul>
  <div id="state"></div>
  <nav class="pager" id="pager" aria-label="Pagination" hidden></nav>
  <noscript><p class="count">Turn on JavaScript to search and page through all posts.</p></noscript>
</main>`
  });
}

/* ---------- Article ---------- */
export function postPage(p, { site, v = '', prev = null, next = null, related = [] }) {
  const lede = p.lede || p.description;
  const img = p.image ? abs(site, p.image) : site.defaultImage ? abs(site, site.defaultImage) : '';
  const sectionUrl = `/?q=${encodeURIComponent(p.section)}`;
  const modified = p.updated || p.date;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'BlogPosting', '@id': p.url + '#post', mainEntityOfPage: p.url,
      headline: p.title, description: p.description, ...(img ? { image: img } : {}),
      datePublished: p.date, dateModified: modified, inLanguage: site.language,
      ...(p.tags.length ? { keywords: p.tags.join(', ') } : {}), wordCount: p.words,
      author: { '@type': p.author === site.defaultAuthor ? 'Organization' : 'Person', name: p.author },
      publisher: { '@type': 'Organization', name: site.name, url: site.domain + '/' }
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: site.domain + '/' },
        { '@type': 'ListItem', position: 2, name: p.section, item: site.domain + sectionUrl },
        { '@type': 'ListItem', position: 3, name: p.title }
      ]
    }]
  };
  const head = `<meta name="author" content="${esc(p.author)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${p.url}">${img ? `\n<meta property="og:image" content="${esc(img)}">\n<meta property="og:image:alt" content="${esc(p.alt)}">` : ''}
<meta property="article:published_time" content="${p.date}T00:00:00Z">
<meta property="article:modified_time" content="${modified}T00:00:00Z">
<meta property="article:section" content="${esc(p.section)}">${p.tags.map(t => `\n<meta property="article:tag" content="${esc(t)}">`).join('')}
<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">${img ? `\n<meta name="twitter:image" content="${esc(img)}">` : ''}
<script type="application/ld+json">${json(ld)}</script>`;

  const toc = p.toc && p.tocItems.length >= 2
    ? `<nav class="toc" aria-label="Table of contents"><h2>In this post</h2><ol>${p.tocItems.map(t => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '';
  const hero = img
    ? `<figure class="hero-img"><img src="${esc(img)}" width="1200" height="675" alt="${esc(p.alt)}" fetchpriority="high" decoding="async">${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>` : '';
  const step = (cls, rel, label, x) => x ? `<a class="${cls}" href="${esc(x.link)}" rel="${rel}"><small>${label}</small><strong>${esc(x.title)}</strong></a>` : '';
  const nav = prev || next ? `<nav class="post-nav" aria-label="More posts">${step('prev', 'prev', 'Previous', prev)}${step('next', 'next', 'Next', next)}</nav>` : '';
  const tags = p.tags.length ? `<ul class="tags" aria-label="Tags">${p.tags.map(t => `<li><a class="chip" href="/?tag=${encodeURIComponent(t)}">${esc(t)}</a></li>`).join('')}</ul>` : '';
  const more = related.length
    ? `<section class="wrap related" aria-labelledby="more-h"><h2 id="more-h">Keep reading</h2><ul class="feed">${related.map((r, i) => cardHTML(r)).join('')}</ul></section>` : '';

  return layout({
    site, v, title: `${p.title} – ${site.name}`, description: p.description, canonical: p.url,
    css: ['cards', 'post'], js: ['post'], head,
    body: `<div class="progress" aria-hidden="true"></div>
<main id="main">
<div class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="${sectionUrl}">${esc(p.section)}</a></li><li aria-current="page">${esc(p.title)}</li></ol></nav>
  <article>
    <header class="article-head">
      <h1>${esc(p.title)}</h1>
      <p class="lede">${esc(lede)}</p>
      <div class="byline">
        <span>By ${esc(p.author)}</span>
        <time datetime="${p.date}">${formatDate(p.date)}</time>
        ${p.updated ? `<span>Updated <time datetime="${p.updated}">${formatDate(p.updated)}</time></span>` : ''}
        <span>${p.mins} min read</span>
      </div>
    </header>
    ${hero}
    ${toc}
    <div class="prose">
${p.html}
    </div>
    ${tags}
  </article>
  ${nav}
</div>
${more}
</main>`
  });
}

/* ---------- 404 ---------- */
export function notFoundPage({ site, v }) {
  return layout({
    site, v, title: `Page not found – ${site.name}`, description: 'This page does not exist.', robots: 'noindex',
    css: ['home'],
    body: `<main id="main" class="wrap"><div class="state">${icon(ICONS.alert)}<h2>Page not found</h2><p>The link may be broken, or the post may have moved.</p><a class="btn" href="/">Browse all posts</a></div></main>`
  });
}
