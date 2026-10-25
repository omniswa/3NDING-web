---
title: "Welcome to 3NDING"
slug: "welcome-to-3nding"
date: 2026-10-25
description: "A first post that shows every formatting option the new 3NDING publishing system supports, from headings and lists to tables, quotes and code."
tags: ["welcome", "guide"]
image: "https://picsum.photos/seed/welcome-3nding/1200/675"
alt: "A bright desk with a notebook and a cup of coffee"
caption: "Replace this placeholder with your own image."
---

Every post is a Markdown file in `content/posts/`. Run the build and it becomes a page, a card on the home page, a sitemap entry and an RSS item.

## Text and links

Text can be **bold**, *italic*, ~~removed~~, ==highlighted== or `inline code`. Link to an [internal page](/) or an [external site](https://developer.mozilla.org/). Press [[Ctrl]] + [[F]] to search a page.

### A subsection

Use `##` for sections and `###` for sub-sections. The page title is the only top-level heading.

## Lists

- Short, scannable items
- Lists can nest:
  - Nested item one
  - Nested item two

1. Write the post in the generator.
2. Save it into the project folder.
3. Run `npm run build`.

## Quotes

> The map is not the territory, but a good one gets you home.
> — Sample Author

## Code

```js
const slugify = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
```

## Tables

Table: What the build checks
| Field | Rule | Limit |
|---|---|--:|
| Title | Short and specific | 60 |
| Description | One clear summary | 160 |

## Wrap-up

Delete this post once you have your own. Posts marked `draft: true` in the front matter are skipped by the build.
