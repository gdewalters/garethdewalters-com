# garethdewalters.com

My personal website built with [Eleventy](https://www.11ty.dev/) and Tailwind that pulls content from [Contentful](https://www.contentful.com/) to generate a fully static site with dynamic content.

---

## Features

- **Eleventy 3.x** for static site generation  
- **Contentful** as headless CMS (via the `contentful` SDK)  
- **Tailwind CSS 4** and PostCSS pipeline (Autoprefixer + CSSNano)  
- **Eleventy plugins**: RSS feed, syntax highlighting, navigation, image optimization, and more  
- **Custom Nunjucks filters** and async shortcodes (e.g., date formatting, Contentful image helper)  
- **Asset bundling** using `esbuild` for JavaScript and PostCSS for CSS  
- **Caching layer** to minimize repeated API calls during development  

---

## Directory structure

```
.
├── _config/         # Eleventy filter definitions
├── _data/           # Dynamic data loaders (Contentful pages, articles, etc.)
├── _helpers/        # Utility modules (cache, Contentful client, JS bundler)
├── _includes/       # Nunjucks layouts and reusable patterns
├── content/         # Page templates and content files
├── css/             # Tailwind source styles
├── public/          # Static assets copied directly to the build
├── scripts/         # Browser-side JavaScript entry points
└── eleventy.config.js
```

---

## Prerequisites

- **Node.js 20+** (ES modules are used throughout)
- `.nvmrc` file specifying Node 20; run `nvm use` (or equivalent) after cloning to ensure the correct version
- A Contentful account with a space configured for the site's content

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
   SETLISTFM_API_KEY=your_setlistfm_api_key   # Setlist.fm API key
   SETLISTFM_USERNAME=your_setlistfm_username # Setlist.fm username
   ```

   To fetch setlists this project uses the [Setlist.fm API](https://www.setlist.fm/help/api). Create a free Setlist.fm account and request an API key on their API page. For local development place `SETLISTFM_API_KEY` and `SETLISTFM_USERNAME` in your `.env` file; for deployments add them as environment variables in your Netlify site settings.

---

## Development

```bash
npm start
```

- Bundles `scripts/main.js` with `esbuild`
- Compiles Tailwind CSS
- Launches Eleventy in serve mode with hot reload

Access the site at <http://localhost:8080> (default Eleventy dev server port).

### Production preview

```bash
npm run start:ppe
```

Serves the site locally with `ELEVENTY_ENV=production`, enabling verification of a production-like build at <http://localhost:8080>.

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

This sets `ELEVENTY_ENV=production`, ensuring the site is built using the production configuration.

Benefits:

- Generates optimized assets ready for deployment.
- Applies production-specific settings.

---

## Contentful integration

- `_helpers/contentfulClient.js` instantiates the Contentful SDK using environment variables.
- `_data` modules (`getContentfulArticles.js`, `getContentfulPageBySlug.js`, etc.) fetch entries and transform them with helpers like `parseSeo` and `parseImageWrapper`.
- A caching layer (`_helpers/cache.js`) stores API responses locally (disabled in production).

---

## Styling and assets

- Tailwind CSS configuration in `css/tailwind.css`
- PostCSS pipeline runs automatically before Eleventy builds
- `public/` folder contains favicons and other static files copied to the final build

---

## JavaScript bundling

- `scripts/main.js` is bundled and minified by `esbuild` via `_helpers/build-js.js`
- The bundled file outputs to `public/assets/scripts/bundle.js` and is referenced in the base layout

---

## Templates and content

- `content/` holds Nunjucks templates with front‑matter, powering pages such as `index.njk`, `about.njk`, and the article pagination system in `writing/article.njk`
- `_includes/layouts/` and `_includes/patterns/` contain reusable components and page layouts
- Custom filters defined in `_config/filters.js` support date formatting, debugging, tag manipulation, and more

---

## Caching

- Responses from Contentful are cached in `.cache/` by default
- Disable caching by setting `SKIP_CACHE=true` or building with `NODE_ENV=production`

---

## RSS feed

- Atom feed available at `/feed/feed.xml` via `@11ty/eleventy-plugin-rss`
- Feed metadata and styling configured in `eleventy.config.js` and `content/feed/pretty-atom-feed.xsl`

---

## Licence

This code for this project is licensed under the **ISC Licence**. See the `LICENCE` file for details.

---

**Adeilad hapus / Happy building!**

[![Netlify Status](https://api.netlify.com/api/v1/badges/701a7166-0f34-49be-b58d-cddefadc0b06/deploy-status)](https://app.netlify.com/projects/prod-garethdewalters-com/deploys)