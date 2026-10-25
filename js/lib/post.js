/* One place that turns front matter + Markdown into a post model and validates it. */
import { render, slugify } from './markdown.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = s => DATE.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const list = v => (Array.isArray(v) ? v : String(v ?? '').replace(/^\[|\]$/g, '').split(','))
  .map(s => String(s).trim().replace(/^["']|["']$/g, '')).filter(Boolean);

export function normalize(data, body, site, fallbackSlug = '') {
  const s = k => String(data[k] ?? '').trim();
  const date = s('date');
  const p = {
    title: s('title'),
    slug: slugify(s('slug') || fallbackSlug || s('title')),
    date,
    year: date.slice(0, 4),
    updated: s('updated'),
    description: s('description'),
    lede: s('lede'),
    author: s('author') || site.defaultAuthor,
    section: s('section') || site.defaultSection,
    tags: list(data.tags),
    image: s('image'),
    alt: s('alt'),
    caption: s('caption'),
    thumbnail: s('thumbnail') || s('image'),
    toc: data.toc !== false,
    draft: data.draft === true
  };
  const md = render(body, { host: new URL(site.domain).host });
  p.html = md.html;
  p.tocItems = md.toc;
  p.words = md.words;
  p.mins = Math.max(1, Math.round(md.words / 200));
  p.link = `/blogs/${p.year}/${p.slug}.html`;
  p.url = site.domain + p.link;
  return p;
}

/* The slim record stored in blogs.json and used by cards. */
export const toListing = p => ({
  title: p.title,
  description: p.description,
  published: p.date,
  ...(p.updated ? { updated: p.updated } : {}),
  thumbnail: p.thumbnail,
  link: p.link,
  section: p.section,
  tags: p.tags,
  readingTime: p.mins
});

export function validate(p, site) {
  const errors = [], warnings = [];
  if (!p.title) errors.push('Missing title.');
  if (!p.description) errors.push('Missing description.');
  if (!validDate(p.date)) errors.push('Date must be a real date written as YYYY-MM-DD.');
  if (p.updated && !validDate(p.updated)) errors.push('"updated" must be written as YYYY-MM-DD.');
  if (!p.slug) errors.push('Could not make a URL slug. Add a title or slug.');
  if (p.image && !p.alt) errors.push('Add alt text for the hero image.');
  if (p.title && `${p.title} – ${site.name}`.length > 60) warnings.push('Title is long. Search engines may cut it off after about 60 characters.');
  if (p.description && (p.description.length < 120 || p.description.length > 160)) warnings.push(`Description is ${p.description.length} characters. Aim for 120–160.`);
  if (!p.tags.length) warnings.push('No tags yet. Tags power related posts and topic filters.');
  if (p.words < 150) warnings.push('Very short post. Under about 150 words it may look thin to search engines.');
  return { errors, warnings };
}
