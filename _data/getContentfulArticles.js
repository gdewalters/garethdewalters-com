// _data/getContentfulPages.js
// This module fetches pages from Contentful and processes them.    

import client from '../_helpers/contentfulClient.js';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';
import parseSeo from '../_helpers/parseSeo.js';
import cachedFetch from '../_helpers/cache.js';

export default async function getContentfulArticles() {
  const fetcher = async () => {
    const entries = await client.getEntries({
      content_type: 'composeArticle',
      order: '-fields.datePublished',
      include: 3
    });

    return entries.items.map(item => {
      const fields = { ...item.fields };
      fields.mainImage = parseImageWrapper(fields.mainImage);
      if (fields.seoMetaData) {
        // fields.seo = parseSeo(fields.seoMetaData);
        fields.seoMetaData = parseSeo(fields.seoMetaData);
      }
      return {
        ...fields,
        sys: item.sys
      };
    });
  };

  try {
    return await cachedFetch('articles', fetcher);
  } catch (error) {
    console.error('Error fetching composeArticle entries:', error);
    return [];
  }
}
