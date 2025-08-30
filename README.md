# garethdewalters.com

My personal website built with [Eleventy](https://www.11ty.dev/) and Tailwind that pulls content from [Contentful](https://www.contentful.com/) to generate a fully static site with dynamic content.

---

## Features

* **Eleventy 3.x** for static site generation
* **Contentful** as headless CMS (via the `contentful` SDK)
* **Tailwind CSS 4** and PostCSS pipeline (Autoprefixer + CSSNano)
* **Eleventy plugins**: RSS feed, syntax highlighting, navigation, image optimization, and more
* **Custom Nunjucks filters** and async shortcodes (e.g., date formatting, Contentful image helper)
* **Asset bundling** using `esbuild` for JavaScript and PostCSS for CSS
* **Caching layer** to minimize repeated API calls during development
* **Setlist.fm offline workflow** — fetch attended gigs on a schedule and render from local JSON (no API calls during build)

---

## Directory structure

```
.
├── _config/         # Eleventy filter definitions
├── _data/           # Global/local data used by Eleventy
│   ├── setlists.attended.index.json   # Offline index; summary rows of attended gigs
│   ├── setlists.views.json            # Precomputed views/groups (byYear/byArtist/...)
│   └── setlists.attended.detail/      # Per-setlist detail JSON (one file per ID)
├── _helpers/        # Utility modules (cache, Contentful client, builders, harvesters)
│   └── fetch-setlists.mjs             # Setlist.fm harvester (runs outside Eleventy)
├── _includes/       # Nunjucks layouts and reusable patterns
├── content/         # Page templates and content files
├── css/             # Tailwind source styles
├── public/          # Static assets copied directly to the build
├── scripts/         # Browser-side JavaScript entry points
└── eleventy.config.js
```

> Note: Filenames with **dots** in `_data` become **nested objects** in templates, e.g.
> `_data/setlists.attended.index.json` → `setlists.attended.index`
> `_data/setlists.views.json` → `setlists.views`

---

## Prerequisites

* **Node.js 20+** (ES modules are used throughout)
* `.nvmrc` file specifying Node 20; run `nvm use` (or equivalent) after cloning to ensure the correct version
* A Contentful account with a space configured for the site's content

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gdewalters/garethdewalters-com.git
   cd garethdewalters-com
   ```

2. **Use the Node version from `.nvmrc`**

   ```bash
   nvm use
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Create a `.env` file** (or set environment variables) with:

   ```
   CONTENTFUL_SPACE_ID=your_space_id
   CONTENTFUL_ACCESS_TOKEN=your_access_token
   CONTENTFUL_ENVIRONMENT=master        # optional, defaults to "master"
   CACHE_TTL_SECONDS=3600               # optional cache TTL
   SKIP_CACHE=true|false                # optional, skip local caching

   # Setlist.fm offline harvesting
   SETLISTFM_API_KEY=your_setlistfm_api_key
   SETLISTFM_USERNAME=your_setlistfm_username
   SETLISTFM_LOCALE=en                  # optional Accept-Language
   SETLISTFM_REFRESH_PAGES=3            # re-check first N pages each run
   SETLISTFM_FULL_RESCAN=0              # set to 1 to force a full re-harvest
   ```

   To fetch setlists this project uses the **Setlist.fm API**. Create a free account and request an API key on their API page. For local development place `SETLISTFM_API_KEY` and `SETLISTFM_USERNAME` in `.env`; for deployments add them as environment variables in your hosting provider.

---

## Development

```bash
npm start
```

* Bundles `scripts/main.js` with `esbuild`
* Compiles Tailwind CSS
* Launches Eleventy in serve mode with hot reload

Access the site at [http://localhost:8080](http://localhost:8080) (default Eleventy dev server port).

### Production preview

```bash
npm run start:ppe
```

Serves the site locally with `ELEVENTY_ENV=production`, enabling verification of a production-like build at [http://localhost:8080](http://localhost:8080).

---

## Local build

```bash
npm run build
```

Generates optimised JavaScript and CSS, then outputs the static site to the `_site` directory.

To serve the production output locally:

```bash
npx @11ty/eleventy --serve
```

### Deployment build

For hosting platforms such as Netlify, build the site with the production environment enabled:

```bash
npm run build:prod
```

Benefits:

* Generates optimized assets ready for deployment.
* Applies production-specific settings.

---

## Contentful integration

* `_helpers/contentfulClient.js` instantiates the Contentful SDK using environment variables.
* `_data` modules (`getContentfulArticles.js`, `getContentfulPageBySlug.js`, etc.) fetch entries and transform them with helpers like `parseSeo` and `parseImageWrapper`.
* A caching layer (`_helpers/cache.js`) stores API responses locally (disabled in production).

---

## Styling and assets

* Tailwind CSS configuration in `css/tailwind.css`
* PostCSS pipeline runs automatically before Eleventy builds
* `public/` folder contains favicons and other static files copied to the final build

---

## JavaScript bundling

* `scripts/main.js` is bundled and minified by `esbuild` via `_helpers/build-js.js`
* The bundled file outputs to `public/assets/scripts/bundle.js` and is referenced in the base layout

---

## Templates and content

* `content/` holds Nunjucks templates with front-matter, powering pages such as `index.njk`, `about.njk`, and the article pagination system in `writing/article.njk`
* `_includes/layouts/` and `_includes/patterns/` contain reusable components and page layouts
* Custom filters defined in `_config/filters.js` support date formatting, debugging, tag manipulation, and more

---

## Caching

* Responses from Contentful are cached in `.cache/` by default
* Disable caching by setting `SKIP_CACHE=true` or building with `NODE_ENV=production`

---

## RSS feed

* Atom feed available at `/feed/feed.xml` via `@11ty/eleventy-plugin-rss`
* Feed metadata and styling configured in `eleventy.config.js` and `content/feed/pretty-atom-feed.xsl`

---

# Setlist.fm (attended gigs) — Offline harvesting & local views

This site **does not call the Setlist.fm API during Eleventy builds**.
Instead, a small Node harvester fetches all **attended gigs** for a user and writes JSON into `_data/`. Eleventy renders from those local files (fast, deterministic builds, no rate limits).

## Getting started with Setlist.fm

1. **Create a Setlist.fm account** and mark your gigs as *Attended*.
2. **Request an API key** on Setlist.fm’s API page (free for personal use).
3. **Set env vars** (see `.env` above): `SETLISTFM_API_KEY`, `SETLISTFM_USERNAME`, optionally `SETLISTFM_LOCALE`.
4. **Run the first harvest**:

   ```bash
   npm run harvest:setlists
   ```
5. **Render locally** with Eleventy — the pages pull from `_data/` (no live API calls).

## What gets created

* `_data/setlists.attended.index.json` — compact **index** of all attended shows
  `items[]` = summary rows (id, date, artist, venue/city/country, tour, festival, url)
* `_data/setlists.views.json` — precomputed **views** for quick grouping
  `byYear`, `byArtist`, `byVenue`, `byFestival`, `byCountry`, plus `labels.country`
  *(Optional) `byId` — id → summary item map for O(1) lookups*
* `_data/setlists.attended.detail/ID.json` — **detail** per setlist (full normalized record incl. sets)

Remember: dotted filenames are **nested globals** in Nunjucks:
`setlists.attended.index` and `setlists.views`.

## NPM scripts

Add to `package.json`:

```json
{
  "scripts": {
    "harvest:setlists": "node ./_helpers/fetch-setlists.mjs",
    "harvest:setlists:full": "SETLISTFM_FULL_RESCAN=1 node ./_helpers/fetch-setlists.mjs"
  }
}
```

## Ongoing updates

* Run manually when needed:

  ```bash
  npm run harvest:setlists
  ```
* Or schedule monthly with GitHub Actions:

  `.github/workflows/harvest.yml`

  ```yaml
  name: Harvest setlist.fm (attended)
  on:
    schedule:
      - cron: "0 3 1 * *"   # 03:00 UTC, 1st of each month
    workflow_dispatch: {}
  jobs:
    harvest:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm ci
        - run: npm run harvest:setlists
          env:
            SETLISTFM_API_KEY: ${{ secrets.SETLISTFM_API_KEY }}
            SETLISTFM_USERNAME: ${{ secrets.SETLISTFM_USERNAME }}
            SETLISTFM_LOCALE: en
            SETLISTFM_REFRESH_PAGES: 3
        - name: Commit & push data (if changed)
          run: |
            git config user.name "bot"
            git config user.email "bot@users.noreply.github.com"
            git add _data/
            git commit -m "chore(data): monthly attended harvest" || echo "No changes"
            git push
  ```

## Harvester behavior

* Endpoint: `GET /user/{username}/attended` (paged; newest first; 20 per page)
* **Delta sync**: fetches until it hits a page that’s all *known* and *older than last harvest*
* **Edit sweep**: always re-checks the first `SETLISTFM_REFRESH_PAGES` pages (default 3) to pick up edits
* **Festival-aware**: normalizes optional `event.festival` into index + detail
* **Integrity hash**: avoids rewriting `index`/`views` when nothing changed
* **Full rescan**: set `SETLISTFM_FULL_RESCAN=1` to rebuild everything

## Data shapes (reference)

**Index** (`_data/setlists.attended.index.json`)

```json
{
  "schemaVersion": 1,
  "harvestedAt": "2025-08-30T00:00:00.000Z",
  "username": "example",
  "count": 123,
  "items": [
    {
      "id": "3bd6443c",
      "eventDate": "20-08-2024",
      "artist": "Supergrass",
      "venue": "Powerstation",
      "city": "Auckland",
      "country": "New Zealand",
      "countryCode": "NZ",
      "tour": "European Tour 2024",
      "festival": "Reading Festival",
      "url": "https://www.setlist.fm/...",
      "lastUpdated": "2024-08-21T12:34:56Z"
    }
  ]
}
```

**Views** (`_data/setlists.views.json`)

```json
{
  "schemaVersion": 1,
  "harvestedAt": "...",
  "byYear": { "2025": ["id1","id2"] },
  "byArtist": { "The National": ["id3"] },
  "byVenue": { "Powerstation, Auckland, NZ": ["id1"] },
  "byFestival": { "Reading Festival": ["id2"] },
  "byCountry": { "NZ": ["id1"] },
  "labels": { "country": { "NZ": "New Zealand" } }
  /* optional: "byId": { "id1": { ...index item... } } */
}
```

**Detail** (`_data/setlists.attended.detail/ID.json`)

```json
{
  "schemaVersion": 1,
  "harvestedAt": "...",
  "username": "example",
  "setlist": { /* normalized full setlist incl. sets[] */ }
}
```

## Using the data in templates

Render gigs **by year** (no API calls during build):

```njk
{% set byYear = setlists.views.byYear %}
{% set index  = setlists.attended.index.items %}

{% if byYear and index %}
  {% for pair in (byYear | dictsort) | reverse %}
    {% set year = pair[0] %}
    {% set ids  = pair[1] %}
    <h2>{{ year }}</h2>
    <ul class="space-y-6">
      {% for id in ids %}
        {% set item = setlists.views.byId and setlists.views.byId[id] or (index | findById(id)) %}
        {% if item %}
          <li class="pb-6 border-b border-gray-200 last:border-b-0">
            <p class="font-medium text-lg text-foreground">
              <span><a href="{{ item.url }}" target="_blank" rel="noopener noreferrer">{{ item.artist }}</a></span>
              {% if item.tour %}<span class="text-muted-foreground"> {{ item.tour }}</span>{% endif %}
            </p>
            <p class="text-muted-foreground text-sm">
              {{ item.eventDate }} at {{ item.venue }}{% if item.city %}, {{ item.city }}{% endif %}{% if item.countryCode %}, {{ item.countryCode }}{% endif %}
            </p>
            {% if item.festival %}
              <p class="text-muted-foreground text-sm"><em>{{ item.festival }}</em></p>
            {% endif %}
          </li>
        {% endif %}
      {% endfor %}
    </ul>
  {% endfor %}
{% else %}
  <p class="text-muted-foreground text-center">No local setlist data found.</p>
{% endif %}
```

**Helper filter (add once in `eleventy.config.js`)**
*(Skip this if you added `views.byId`):*

```js
export default function (config) {
  config.addFilter("findById", (items, id) =>
    Array.isArray(items) ? items.find(i => i.id === id) : null
  );
  return {};
}
```

### Badge: show “last harvested” time (optional)

Drop this anywhere you like (e.g., on your Listening page):

```njk
{% set harvestedAt = setlists.attended.index.harvestedAt %}
{% if harvestedAt %}
  <span class="inline-flex items-center rounded-full border px-2 py-1 text-xs text-muted-foreground">
    Setlist data updated:
    <span class="ml-1 font-medium">
      {{ harvestedAt | readableDate or harvestedAt }}
    </span>
  </span>
{% endif %}
```

> Replace `readableDate` with your site’s date filter (or leave the ISO string).

## Troubleshooting

* **Empty lists in templates**: use **nested globals** (`setlists.attended.index`, `setlists.views`), not old variable names.
* **“Object.keys is undefined”** in Nunjucks: don’t call global JS — use `dictsort`/`reverse` instead.
* **No changes committed by CI**: likely no data changed; integrity hash prevents churny commits.
* **Data looks stale**: run `npm run harvest:setlists:full` once to force a full rescan.
* **Rate limits**: the harvester backs off on HTTP 429; lower frequency or reduce `SETLISTFM_REFRESH_PAGES` if needed.

---

## Licence

This code for this project is licensed under the **ISC Licence**. See the `LICENCE` file for details.

---

**Adeilad hapus / Happy building!**

[![Netlify Status](https://api.netlify.com/api/v1/badges/701a7166-0f34-49be-b58d-cddefadc0b06/deploy-status)](https://app.netlify.com/projects/prod-garethdewalters-com/deploys)
