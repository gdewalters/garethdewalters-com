// eleventy.config.js
// This file configures Eleventy, a static site generator.
// It sets up plugins, filters, and other configurations for the site build.

import { IdAttributePlugin, InputPathToUrlTransformPlugin, HtmlBasePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginNavigation from "@11ty/eleventy-navigation";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import Image from "@11ty/eleventy-img";

import 'dotenv/config'; // Load environment variables (ESM syntax for dotenv)
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS } from '@contentful/rich-text-types';

import parseImageWrapper from './_helpers/parseImageWrapper.js';

import fs from 'fs';
import path from 'path';

import cssnano from 'cssnano';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

import { getContentfulPageBySlug } from './_data/getContentfulPageBySlug.js';

import pluginFilters from "./_config/filters.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function(eleventyConfig) {

	//compile tailwind before eleventy processes the files
	eleventyConfig.on('eleventy.before', async () => {
	const tailwindInputPath = path.resolve('./css/tailwind.css');

	const tailwindOutputPath = './_site/assets/styles/style.css';

	const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

	const outputDir = path.dirname(tailwindOutputPath);
		if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
		}

		const result = await processor.process(cssContent, {
		from: tailwindInputPath,
		to: tailwindOutputPath,
		});

		fs.writeFileSync(tailwindOutputPath, result.css);
	});

        const processor = postcss([
                //compile tailwind
                tailwindcss(),

                //add vendor prefixes
                autoprefixer(),

                //minify tailwind css
                cssnano({
                preset: 'default',
                }),
        ]);

	// Generate a param for the CSS to force latest version
	const now = String(Date.now())

	eleventyConfig.addShortcode('version', function () {
		return now
	})

	// eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
	//     if(data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
	//         return false;
	//     }
	// });

        // Add a filter to render Contentful rich text to HTML
        eleventyConfig.addFilter("renderRichTextAsHtml", (json) => {
                const options = {
                        renderNode: {
                                [BLOCKS.EMBEDDED_ENTRY]: (node) => {
                                        const entry = node.data.target;
                                        if (entry?.sys?.contentType?.sys?.id === 'mediaImageAsset') {
                                                const img = parseImageWrapper(entry);
                                                if (img) {
                                                        return `<figure><img src="${img.url}" alt="${img.alt}">${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}</figure>`;
                                                }
                                        }
                                        return '';
                                },
                                [BLOCKS.EMBEDDED_ASSET]: (node) => {
                                        const asset = node.data.target;
                                        const url = asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : '';
                                        const alt = asset?.fields?.title || '';
                                        return url ? `<img src="${url}" alt="${alt}">` : '';
                                },
                        }
                };
                return documentToHtmlString(json, options);
        });

	// In eleventy.config.js, inside the `export default async function(eleventyConfig) { ... }` function

	eleventyConfig.addNunjucksAsyncShortcode("contentfulImage", async function(imageObject, alt, widths, formats, sizes) {
		if (!imageObject || !imageObject.url) {
			// Return an empty string or a placeholder if imageObject or its URL is missing
			// This prevents errors if Contentful data is incomplete
			console.warn('contentfulImage: Missing imageObject or imageObject.url. Returning empty string.');
			return "";
		}

		// Convert Contentful URL to a format eleventy-img can process
		// Contentful image URLs sometimes have query parameters for sizing, which eleventy-img doesn't need for its source.
		const cleanImageUrl = imageObject.url.split('?')[0];

		// Options for eleventy-img
		let imageOptions = {
			widths: widths || ["auto"], // Default to auto if no widths are provided
			formats: formats || ["webp", "jpeg"], // Default to webp and jpeg
			outputDir: "./_site/assets/images/", // Output directory for generated images
			urlPath: "/assets/images/", // URL path for generated images in HTML
			// You can add more options here like `sharpOptions`, `cacheDuration`, etc.
		};

		// If a specific outputDir or urlPath for the plugin was already set, you might want to use those.
		// For now, let's keep them explicit within the shortcode for clarity.
		// Note: The eleventyImageTransformPlugin also uses these, so ensure consistency or understand the override order.

		// Generate image metadata
		let metadata = await Image(cleanImageUrl, imageOptions);

		// Get the lowest quality JPEG or first available format for the base <img> src
		let lowsrc = metadata.jpeg ? metadata.jpeg[0] : Object.values(metadata)[0][0];

		// Attributes for the <img> tag
		let imageAttributes = {
			alt: alt,
			sizes: sizes || "100vw", // Default to 100vw if no sizes are provided
			loading: "lazy",
			decoding: "async",
			// Add any other attributes you want to apply to the <img> tag
		};

		// Generate the <picture> element HTML
		return `
		<picture>
			${Object.values(metadata).map(imageFormat => {
				return `<source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map(entry => entry.srcset).join(", ")}" sizes="${imageAttributes.sizes}">`;
			}).join("\n")}
			<img
				src="${lowsrc.url}"
				width="${lowsrc.width}"
				height="${lowsrc.height}"
				alt="${imageAttributes.alt}"
				loading="${imageAttributes.loading}"
				decoding="${imageAttributes.decoding}"
			>
		</picture>`;
	});


	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig
		.addPassthroughCopy({
			"./public/": "/"
		})
		.addPassthroughCopy("./content/feed/pretty-atom-feed.xsl");

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

	// Watch CSS files
	eleventyConfig.addWatchTarget("css/**/*.css");
	// Watch images for the image pipeline.
	eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpg,jpeg,gif}");

	// Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
	// Bundle <style> content and adds a {% css %} paired shortcode
	eleventyConfig.addBundle("css", {
		toFileDirectory: "dist",
		// Add all <style> content to `css` bundle (use <style eleventy:ignore> to opt-out)
		// Supported selectors: https://www.npmjs.com/package/posthtml-match-helper
		bundleHtmlContentFromSelector: "style",
	});

	// Bundle <script> content and adds a {% js %} paired shortcode
	eleventyConfig.addBundle("js", {
		toFileDirectory: "dist",
		// Add all <script> content to the `js` bundle (use <script eleventy:ignore> to opt-out)
		// Supported selectors: https://www.npmjs.com/package/posthtml-match-helper
		bundleHtmlContentFromSelector: "script",
	});

	// Official plugins
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 }
	});
	eleventyConfig.addPlugin(pluginNavigation);

	// Define a navigation group for my main menu
	eleventyConfig.addGlobalData("eleventyNavigation", {
		// This defines a special "root" item for your primary navigation
		// Pages will use "parent: 'mainNav'" to belong to this group
		items: [
		{
			key: "mainNav", // A unique key for your main navigation group
			order: 0        // Give it an order so it appears first if you list all eleventyNavigation items
		}
		]
	});

	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

	eleventyConfig.addPlugin(feedPlugin, {
		type: "atom", // or "rss", "json"
		outputPath: "/feed/feed.xml",
		stylesheet: "pretty-atom-feed.xsl",
		templateData: {
			eleventyNavigation: {
				key: "Feed",
				order: 4
			}
		},
		collection: {
			name: "posts",
			limit: 10,
		},
		metadata: {
			language: "en",
			title: "Blog Title",
			subtitle: "This is a longer description about your blog.",
			base: "https://example.com/",
			author: {
				name: "Your Name"
			}
		}
	});

	// Image optimization: https://www.11ty.dev/docs/plugins/image/#eleventy-transform
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {

		// Specify the directory where the transformed images will be saved
		outputDir: "./_site/assets/images/", // This is the default, but you can change it
		
		// Specify the base URL path for the images in your HTML output (<img> src)
		urlPath: "/assets/images/", // This is also the default


		// Output formats for each image.
		formats: ["avif", "webp", "auto"],

		// widths: ["auto"],

		failOnError: false,
		htmlOptions: {
			imgAttributes: {
				// e.g. <img loading decoding> assigned on the HTML tag will override these values.
				loading: "lazy",
				decoding: "async",
			}
		},

		sharpOptions: {
			animated: true,
		},
	});

	// Filters
	eleventyConfig.addPlugin(pluginFilters);

	eleventyConfig.addPlugin(IdAttributePlugin, {
		// by default we use Eleventy’s built-in `slugify` filter:
		// slugify: eleventyConfig.getFilter("slugify"),
		// selector: "h1,h2,h3,h4,h5,h6", // default
	});

	eleventyConfig.addShortcode("currentBuildDate", () => {
		return (new Date()).toISOString();
	});
	
	// Features to make your build faster (when you need them)

	// If your passthrough copy gets heavy and cumbersome, add this line
	// to emulate the file copy on the dev server. Learn more:
	// https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

	// eleventyConfig.setServerPassthroughCopyBehavior("passthrough");
};

export const config = {
	// Control which files Eleventy will process
	// e.g.: *.md, *.njk, *.html, *.liquid
	templateFormats: [
		"md",
		"njk",
		"html",
		"liquid",
		"11ty.js",
	],

	// Pre-process *.md files with: (default: `liquid`)
	markdownTemplateEngine: "njk",

	// Pre-process *.html files with: (default: `liquid`)
	htmlTemplateEngine: "njk",

	// Pre-process ? files with: (default: `njk`)
    dataTemplateEngine: "njk",

	// These are all optional:
	dir: {
		input: "content",          // default: "."
		includes: "../_includes",  // default: "_includes" (`input` relative)
		data: "../_data",          // default: "_data" (`input` relative)
		output: "_site"
	},

	// -----------------------------------------------------------------
	// Optional items:
	// -----------------------------------------------------------------

	// If your site deploys to a subdirectory, change `pathPrefix`.
	// Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

	// When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
	// it will transform any absolute URLs in your HTML to include this
	// folder name and does **not** affect where things go in the output folder.

	// pathPrefix: "/",
};
