// _config/filters.js
// Filters for Eleventy configuration
// This file contains custom filters for date formatting, array manipulation, and debugging.
// It uses Luxon for date handling and Flatted for JSON serialization.
// Make sure to install the required packages: luxon and flatted.

import {
    DateTime
} from "luxon";
import {
    stringify
} from "flatted";

export default function(eleventyConfig) {

    // Add a universal 'keys' filter to get object keys.
    // This filter will be available in Nunjucks (and Liquid, etc.).
    eleventyConfig.addFilter("keys", (obj) => Object.keys(obj));

    eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
        // Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
        // Handle both Date objects and ISO date strings from Contentful
        const dt = dateObj instanceof Date ?
            DateTime.fromJSDate(dateObj, {
                zone: zone || "utc"
            }) :
            DateTime.fromISO(String(dateObj), {
                zone: zone || "utc"
            });
        return dt.toFormat(format || "dd LLLL yyyy");
    });

    eleventyConfig.addFilter("htmlDateString", (dateObj) => {
        // dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
        const dt = dateObj instanceof Date ?
            DateTime.fromJSDate(dateObj, {
                zone: "utc"
            }) :
            DateTime.fromISO(String(dateObj), {
                zone: "utc"
            });
        return dt.toFormat('yyyy-LL-dd');
    });

    // Get the first `n` elements of a collection.
    eleventyConfig.addFilter("head", (array, n) => {
        if (!Array.isArray(array) || array.length === 0) {
            return [];
        }
        if (n < 0) {
            return array.slice(n);
        }

        return array.slice(0, n);
    });

    // Return the smallest number argument
    eleventyConfig.addFilter("min", (...numbers) => {
        return Math.min.apply(null, numbers);
    });

    // Return the keys used in an object
    eleventyConfig.addFilter("getKeys", target => {
        return Object.keys(target);
    });

    eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
        return (tags || []).filter(tag => ["all", "posts"].indexOf(tag) === -1);
    });

    eleventyConfig.addFilter("sortAlphabetically", strings =>
        (strings || []).sort((b, a) => b.localeCompare(a))
    );

    // Dump object as formatted JSON for debugging
    eleventyConfig.addFilter("dump", obj => {
        try {
            return stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    });

    // Add a filter to format the date from 'DD-MM-YYYY' to a more readable format.
    eleventyConfig.addFilter("date_format", (dateStr) => {
        if (!dateStr) return '';
        const [day, month, year] = dateStr.split('-');
        // Create a Date object in a consistent way (YYYY-MM-DD for reliable parsing)
        const date = new Date(`${year}-${month}-${day}T00:00:00`);
        if (isNaN(date.getTime())) { // Check for invalid date
            return dateStr; // Return original string if date is invalid
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    });

    // Add a slugify filter for creating clean URLs.
    eleventyConfig.addFilter("slug", (input) => {
        if (typeof input !== 'string') return '';
        return input
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    });

};