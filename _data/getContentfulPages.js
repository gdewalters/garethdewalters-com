// _data/getContentfulPages.js
// This module fetches pages from Contentful and processes them.
// It uses the Contentful client to retrieve entries of type 'composePage',
// applies image parsing, and SEO parsing to the fields of each entry.  

import client from '../_helpers/contentfulClient.js';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';
import parseSeo from '../_helpers/parseSeo.js';
import cachedFetch from '../_helpers/cache.js';

export default async function getContentfulPages() {
  const fetcher = async () => {
    const entries = await client.getEntries({
      content_type: 'composePage',
      order: 'fields.pageTitle',
      include: 3
    });

    return entries.items.map(item => {
      // For each entry, extract the fields and parse the main image.
      // The main image is wrapped in a specific structure, so we use a helper
      // function to extract the URL and other properties.
      // The parseImageWrapper function returns an object with the image URL
      // and alt text, or null if no image is present.
      const fields = { ...item.fields };
      fields.mainImage = parseImageWrapper(fields.mainImage);

      // If the entry has a 'seoMetaData' field, parse it for SEO properties. 
      if (fields.seoMetaData) {
        // fields.seo = parseSeo(fields.seoMetaData);
        fields.seoMetaData = parseSeo(fields.seoMetaData);
      }
      return {
        ...fields,
        sys: item.sys,
      };
    });
  };

  try {
    return await cachedFetch('pages', fetcher);
  } catch (error) {
    console.error('Error fetching composePage entries:', error);
    return [];
  }
}
