# garethdewalters.com

A personal website built with [Eleventy](https://www.11ty.dev/) that pulls content from [Contentful](https://www.contentful.com/). The project demonstrates how to combine Eleventy, Tailwind CSS, and Contentful to generate a fully static site with dynamic content.

---

## Features

- **Eleventy 3.x** for static site generation  
- **Contentful** as headless CMS (via the `contentful` SDK)  
- **Tailwind CSS 4** and PostCSS pipeline (Autoprefixer + CSSNano)  
- **Eleventy plugins**: RSS feed, syntax highlighting, navigation, image optimization, and more  
- **Custom Nunjucks filters** and async shortcodes (e.g., date formatting, Contentful image helper)  
- **Asset bundling** using `esbuild` for JavaScript and PostCSS for CSS  
- **Caching layer** to minimize repeated API calls during development  
- **Search-ready output** through `pagefind`

---

## Directory Structure

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

- **Node.js 18+** (ES modules are used throughout)
- A Contentful account with a space configured for the site's content

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gdewalters/gdewalters-com.git
   cd gdewalters-com
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a `.env` file** (or set environment variables) with:

   ```
   CONTENTFUL_SPACE_ID=your_space_id
   CONTENTFUL_ACCESS_TOKEN=your_access_token
   CONTENTFUL_ENVIRONMENT=master        # optional, defaults to "master"
   CACHE_TTL_SECONDS=3600               # optional cache TTL
   SKIP_CACHE=true|false                # optional, skip local caching
   ```

---

## Development

```bash
npm start
```

- Bundles `scripts/main.js` with `esbuild`
- Compiles Tailwind CSS
- Launches Eleventy in serve mode with hot reload

Access the site at <http://localhost:8080> (default Eleventy dev server port).

---

## Production Build

```bash
npm run build
```

Generates optimized JavaScript and CSS, then outputs the static site to the `_site` directory.

To serve the production output locally:

```bash
npx @11ty/eleventy --serve
```

---

## Contentful Integration

- `_helpers/contentfulClient.js` instantiates the Contentful SDK using environment variables.
- `_data` modules (`getContentfulArticles.js`, `getContentfulPageBySlug.js`, etc.) fetch entries and transform them with helpers like `parseSeo` and `parseImageWrapper`.
- A caching layer (`_helpers/cache.js`) stores API responses locally (disabled in production).

---

## Styling & Assets

- Tailwind CSS configuration in `css/tailwind.css`
- PostCSS pipeline runs automatically before Eleventy builds
- `public/` folder contains favicons and other static files copied to the final build

---

## JavaScript Bundling

- `scripts/main.js` is bundled and minified by `esbuild` via `_helpers/build-js.js`
- The bundled file outputs to `public/assets/scripts/bundle.js` and is referenced in the base layout

---

## Templates & Content

- `content/` holds Nunjucks templates with front‑matter, powering pages such as `index.njk`, `about.njk`, and the article pagination system in `writing/article.njk`
- `_includes/layouts/` and `_includes/patterns/` contain reusable components and page layouts
- Custom filters defined in `_config/filters.js` support date formatting, debugging, tag manipulation, and more

---

## Caching

- Responses from Contentful are cached in `.cache/` by default
- Disable caching by setting `SKIP_CACHE=true` or building with `NODE_ENV=production`

---

## RSS Feed

- Atom feed available at `/feed/feed.xml` via `@11ty/eleventy-plugin-rss`
- Feed metadata and styling configured in `eleventy.config.js` and `content/feed/pretty-atom-feed.xsl`

---

## License

This code for this project is licensed under the **ISC License**. See the `LICENSE` file for details.

---

**Happy building!**

