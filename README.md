# 3NDING

A static blog with no dependencies and no framework. Posts are Markdown files; a small Node script turns them into plain HTML.

## Daily workflow

1. Open `generator.html` (run `npm run dev`, then go to http://localhost:3000/generator.html).
2. Write the post. Press **Save to project folder** (Chrome/Edge) or **Download .md** and drop the file in `content/posts/YEAR/`.
3. Run `npm run build`.
4. Deploy the project folder.

You can also write posts by hand. Copy `content/posts/2026/welcome-to-3nding.md` and edit it.

## What the build writes

`index.html`, `404.html`, `blogs/**`, `blogs.json`, `sitemap.xml`, `feed.xml`, `robots.txt`. Do not edit these by hand. They are rebuilt every time, and `blogs/` is emptied first.

## Where things live

| Path | What it is |
|---|---|
| `content/posts/YEAR/*.md` | Your posts (the only thing you normally touch) |
| `site.config.json` | Site name, domain, tagline, page size, footer links |
| `js/lib/templates.js` | Header, footer, home, article and 404 HTML. Change the design of every page here |
| `js/lib/markdown.js`, `js/lib/post.js` | Markdown parser, front matter, validation. Shared by the build and the generator |
| `css/` | `base` (all pages), `cards`, `home`, `post`, `generator` |
| `scripts/build.mjs`, `scripts/serve.mjs` | Build and local server |

## Front matter

```yaml
title: "Required"
description: "Required. 120-160 characters is ideal."
date: 2026-10-25          # required, YYYY-MM-DD
slug: "my-post"           # optional, defaults to the file name
updated: 2026-11-02       # optional
author: "Name"            # optional, defaults to site.config.json
section: "Stories"        # optional category
tags: ["one", "two"]
image: "https://..."      # hero image; alt is then required
alt: "Describe the image"
caption: "Optional"
thumbnail: "https://..."  # optional card image, defaults to image
toc: false                # hide the table of contents
draft: true               # skip this post in the build
```

The build stops with a clear message if a required field is missing, a date is invalid, or two posts share a URL.

## Deploying

Any static host works. Serve the project folder (or copy everything except `content/`, `scripts/`, `package.json` and `generator.html`). Keep `generator.html` off the public site if you prefer. It is already `noindex` and blocked in `robots.txt`. `_headers` is picked up by Netlify and Cloudflare Pages.

To build automatically on every push, run `node scripts/build.mjs` in your host's build step (Node 18 or newer).
