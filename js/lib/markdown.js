/* Shared by the build script (Node) and the generator (browser). No DOM or Node APIs here. */

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- Front matter ---------- */
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const KEYS = ['title', 'slug', 'date', 'updated', 'description', 'lede', 'author', 'section', 'tags', 'image', 'alt', 'caption', 'thumbnail', 'toc', 'draft'];

function parseValue(raw) {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^["\[{]/.test(v)) { try { return JSON.parse(v); } catch {} }
  if (/^'.*'$/.test(v)) return v.slice(1, -1);
  return v;
}

export function parseFrontMatter(text) {
  const m = text.replace(/^\uFEFF/, '').match(FM);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 1 || line.trimStart().startsWith('#')) continue;
    data[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
  }
  return { data, body: m[2] };
}

export function toFrontMatter(d, body = '') {
  const lines = [];
  for (const k of KEYS) {
    const v = d[k];
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue;
    if ((k === 'toc' && v === true) || (k === 'draft' && v === false)) continue; // defaults
    lines.push(`${k}: ${k === 'date' || k === 'updated' || typeof v === 'boolean' ? v : JSON.stringify(v)}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '').replace(/\s*$/, '\n')}`;
}

/* ---------- Markdown → HTML ---------- */
const safeUrl = u => (/^\s*(javascript|data|vbscript):/i.test(u) ? '#' : u);

export function render(src, { host = '' } = {}) {
  const own = host ? new RegExp('^https?://(www\\.)?' + host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

  function inline(t) {
    const codes = [];
    t = t.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = esc(t);
    t = t.replace(/\[\[(.+?)\]\]/g, '<kbd>$1</kbd>');
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, u) => {
      const ext = /^https?:\/\//i.test(u) && !(own && own.test(u));
      return `<a href="${safeUrl(u)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${txt}</a>`;
    });
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/==(.+?)==/g, '<mark>$1</mark>');
    return t.replace(/\u0000(\d+)\u0000/g, (m, n) => '<code>' + esc(codes[n]) + '</code>');
  }

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [], toc = [], used = {};
  const LI = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  const SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  const IMG = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;
  const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
  const isTable = i => i + 1 < lines.length && lines[i].includes('|') && SEP.test(lines[i + 1]);
  const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const blockStart = i => {
    const l = lines[i];
    return /^```/.test(l) || /^#{1,6}\s/.test(l) || HR.test(l) || /^\s*>/.test(l) || LI.test(l) || IMG.test(l) || isTable(i) || (/^Table:/i.test(l) && isTable(i + 1));
  };
  const headId = text => {
    const base = slugify(text) || 'section';
    let id = base, n = 2;
    while (used[id]) id = base + '-' + n++;
    used[id] = 1;
    return id;
  };

  function parseList(i, indent) {
    const tag = /\d/.test(lines[i].match(LI)[2]) ? 'ol' : 'ul';
    let html = `<${tag}>`;
    while (i < lines.length) {
      const m = lines[i].match(LI);
      if (!m || m[1].length !== indent) break;
      let item = inline(m[3]);
      i++;
      while (i < lines.length) {
        const n = lines[i].match(LI);
        if (n && n[1].length > indent) { const r = parseList(i, n[1].length); item += r[0]; i = r[1]; } else break;
      }
      html += `<li>${item}</li>`;
    }
    return [html + `</${tag}>`, i];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;

    if ((m = line.match(/^```\s*([\w+-]*)/))) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code${m[1] ? ` class="language-${esc(m[1])}"` : ''}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) {
      const lvl = Math.min(4, Math.max(2, m[1].length)); // the page title is the only h1
      const plain = m[2].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*`~=]/g, '');
      const id = headId(plain);
      if (lvl === 2) toc.push({ id, text: plain });
      out.push(`<h${lvl} id="${id}">${inline(m[2])}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${lvl}>`);
      i++;
      continue;
    }
    if (HR.test(line)) { out.push('<hr>'); i++; continue; }
    if ((m = line.match(IMG))) {
      out.push(`<figure><img src="${esc(safeUrl(m[2]))}" alt="${esc(m[1])}" loading="lazy" decoding="async">${m[3] ? `<figcaption>${esc(m[3])}</figcaption>` : ''}</figure>`);
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      let body = buf.join('\n').trim(), cite = '';
      const cm = body.match(/(?:^|\n)\s*(?:—|--)\s*(.+)$/);
      if (cm) { cite = cm[1]; body = body.slice(0, cm.index).trim(); }
      const paras = body.split(/\n\s*\n/).filter(Boolean).map(p => `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('');
      out.push(`<blockquote>${paras}${cite ? `<footer>— ${inline(cite)}</footer>` : ''}</blockquote>`);
      continue;
    }
    let caption = '';
    if (/^Table:/i.test(line) && isTable(i + 1)) { caption = line.replace(/^Table:\s*/i, ''); i++; }
    if (isTable(i)) {
      const head = cells(lines[i]);
      const align = cells(lines[i + 1]).map(c => /:$/.test(c) ? 'num' : '');
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(cells(lines[i++]));
      const cls = k => align[k] ? ' class="num"' : '';
      const capId = 'tbl-' + out.length;
      out.push(`<div class="table-wrap" role="region" ${caption ? `aria-labelledby="${capId}"` : 'aria-label="Table"'} tabindex="0"><table>${caption ? `<caption id="${capId}">${inline(caption)}</caption>` : ''}<thead><tr>${head.map((c, k) => `<th scope="col"${cls(k)}>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${head.map((_, k) => k === 0 ? `<th scope="row"${cls(k)}>${inline(r[k] || '')}</th>` : `<td${cls(k)}>${inline(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if ((m = line.match(LI))) {
      const r = parseList(i, m[1].length);
      out.push(r[0]);
      i = r[1];
      continue;
    }
    const buf = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !blockStart(i)) buf.push(lines[i++].trim());
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  const words = src.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return { html: out.join('\n'), toc, words };
}
