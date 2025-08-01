// getContentfulPageBySlug.js
// This module fetches a specific page from Contentful by its slug and processes it.
// It uses caching to optimize performance and reduce API calls.
// The page is expected to have a specific content type and structure.
// The slug is used to identify the page, and it should match the 'fields.slug'
// field in Contentful entries.
// The function returns the processed page data or null if not found.

import client from '../_helpers/contentfulClient.js';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';
import parseSeo from '../_helpers/parseSeo.js';
import cachedFetch from '../_helpers/cache.js';

export async function getContentfulPageBySlug(slug) {
  if (!slug) {
    return null;
  }

  const fetcher = async () => {
    const entries = await client.getEntries({
      content_type: 'composePage',
      'fields.slug': slug,
      include: 3,
      limit: 1,
    });

    if (!entries.items.length) {
      return null;
    }

    const item = entries.items[0];
    const fields = { ...item.fields };
    fields.mainImage = parseImageWrapper(fields.mainImage);

    if (fields.seoMetaData) {
      fields.seoMetaData = parseSeo(fields.seoMetaData);
    }

    return {
      ...fields,
      sys: item.sys
    };
  };

  try {
    return await cachedFetch(`page_${slug}`, fetcher);
  } catch (error) {
    console.error(`Error fetching composePage with slug ${slug}:`, error);
    return null;
  }
}
