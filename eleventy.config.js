// Import prior to `module.exports` within `.eleventy.js`
const { DateTime } = require("luxon");
const readingTime = require('eleventy-plugin-reading-time');
const Image = require("@11ty/eleventy-img");
const { eleventyImageTransformPlugin } = require("@11ty/eleventy-img");
const { execSync } = require('child_process')

/*
// Article ID generator: https://www.uuidtools.com
*/

module.exports = async function(eleventyConfig) {
	const { EleventyHtmlBasePlugin } = await import("@11ty/eleventy");	

  	/* 
		Enable plug-ins 
	*/

	// Offical plug-in: HTML <base> - https://www.11ty.dev/docs/plugins/html-base/
	eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

	// Reading time
	eleventyConfig.addPlugin(readingTime);

	// Image transmormation
	eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
		// which file extensions to process
		extensions: "html",

		// Add any other Image utility options here:

		// optional, output image formats
		formats: ["webp", "jpeg"],
		formats: ["auto"],

		// optional, output image widths
		widths: ["auto"],

		// optional, attributes assigned on <img> override these values.
		defaultAttributes: {
			loading: "lazy",
			decoding: "async",
		},
	});

	eleventyConfig.on('eleventy.after', () => {
		execSync(`npx pagefind --site _pre-prod --glob \"**/*.html\"`, { encoding: 'utf-8' })
	})

  	/* 
		Shortcodes
	*/

	// Get current year
	eleventyConfig.addShortcode("currentYear", () => `${new Date().getFullYear()}`);


  	/* 
		Template filters 
	*/

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers);
	});

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if(!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if( n < 0 ) {
			return array.slice(n);
		}

		return array.slice(0, n);
	});

	// Parse a date string
	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
	});

	// Generate a readable date
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
	});

	// Generate a readable date with no year
	eleventyConfig.addFilter("readableDateNoYear", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL");
	});

	// Return all the tags used in a collection
	eleventyConfig.addFilter("getAllTags", collection => {
		let tagSet = new Set();
		for(let item of collection) {
			(item.data.tags || []).forEach(tag => tagSet.add(tag));
		}
		return Array.from(tagSet);
	});

	// Filter tags 
	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
	});

  	/* 
		Collections 
	*/

	// https://www.roboleary.net/2024/03/01/eleventy-posts-by-year.html
	eleventyConfig.addCollection("postsByYearDescVersion21", (collection) => {
		let posts = collection
		  .getFilteredByGlob("_staging/writing/**/*.md")
		  .sort((a, b) => b.date - a.date);
	
		const postsByYear = Map.groupBy(posts, ({ date }) =>
		  new Date(date).getFullYear()
		);
	
		return postsByYear;
	  });

  	/* 
		Template preferences 
	*/

	return {
		// Control which files Eleventy will process
		// e.g.: *.md, *.njk, *.html, *.liquid
		// Added file extenstions to enable 'Passthrough by File Extension' - https://www.11ty.dev/docs/copy/#passthrough-by-file-extension
		templateFormats: [
			"md",
			"njk",
			"html",
			"liquid",
			"css",
			"ico",
			"jpg",
			"png",
			"webp",
			"xml",
			"webmanifest",
			"eot",
			"svg",
			"ttf",
			"woff",
			"woff2"
		],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: "njk",

		// These are all optional:
		dir: {
			input: "_staging",         // default: "."
			includes: "../_includes",  // default: "_includes"
			data: "../_data",          // default: "_data"
			output: "_pre-prod"
		},
	};

  	/* 
		Pass-through directives 
	*/
	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`

};