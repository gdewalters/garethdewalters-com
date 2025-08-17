// _data/getContentfulArticleSingle.js
// This module fetches a single article entry from Contentful, specifically for the promo article.
// It includes error handling and caching for performance.
// It also processes the main image and deck content if available.
// Note: The entry ID is hardcoded for testing purposes; it should be replaced with an environment variable in production.   

import client from '../_helpers/contentfulClient.js';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';
import parseSeo from '../_helpers/parseSeo.js';
import cachedFetch from '../_helpers/cache.js';
import renderRichTextAsHtml from '../_helpers/renderRichTextAsHtml.js';

export default async function getContentfulArticleSingle() {
  // const entryId = process.env.PROMO_ARTICLE_ENTRY_ID;
  const entryId = '5Xdx6Pcqw8f75JSERlMMJh'; // For testing purposes, replace with actual environment variable in production

  if (!entryId) {
    console.warn('PROMO_ARTICLE_ENTRY_ID environment variable is not set.');
    return null;
  }

  const fetcher = async () => {
    const entry = await client.getEntry(entryId, { include: 3 });
    const fields = { ...entry.fields };

    const imageEntry = fields.mainImage || fields.image || null;
    fields.mainImage = parseImageWrapper(imageEntry);

    if (fields.body) {
      fields.body = renderRichTextAsHtml(fields.body);
    }

    // ✨ Add this block to process SEO for articles/promos ✨
    if (fields.seoMetaData) {
      fields.seoMetaData = parseSeo(fields.seoMetaData);
    }

    // This 'deck' processing might still be unnecessary if you only want a single article's fields.
    // However, for now, we're leaving it as is, focusing on the mainImage fix.
    const deck = (fields.deckContent || []).map(item => {
      const typeId = item.sys?.contentType?.sys?.id;
      if (typeId === 'composeArticle') {
        const articleFields = { ...item.fields };
        // This line is for images *within* the deckContent, if it were used.
        articleFields.mainImage = parseImageWrapper(articleFields.mainImage);
        if (articleFields.body) {
          articleFields.body = renderRichTextAsHtml(articleFields.body);
        }
        return { ...articleFields, sys: item.sys };
      }
      return null;
    }).filter(Boolean);

    return { ...fields, deckContent: deck, sys: entry.sys };
  };

  try {
    return await cachedFetch(`cardDeck_${entryId}`, fetcher);
  } catch (error) {
    console.error('Error fetching card deck entry:', error);
    return null;
  }
}
