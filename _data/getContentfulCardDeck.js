// _data/getContentfulCardDeck.js
// This module fetches a card deck entry from Contentful.
// It processes the deck content, which can include articles and cards.   

import client from '../_helpers/contentfulClient.js';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';
import cachedFetch from '../_helpers/cache.js';

export default async function getContentfulCardDeck() {
  const entryId = process.env.HOME_CARD_DECK_ENTRY_ID;
  if (!entryId) {
    console.warn('CARD_DECK_ENTRY_ID environment variable is not set.');
    return null;
  }

  const fetcher = async () => {
    const entry = await client.getEntry(entryId, { include: 6 });
    const fields = { ...entry.fields };
    const deck = (fields.deckContent || []).map(item => {
      const typeId = item.sys?.contentType?.sys?.id;
      if (typeId === 'composeArticle') {
        const articleFields = { ...item.fields };
        articleFields.mainImage = parseImageWrapper(articleFields.mainImage);
        return { ...articleFields, sys: item.sys };
      }
      if (typeId === 'componentCard') {
        return { ...item.fields, sys: item.sys };
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
