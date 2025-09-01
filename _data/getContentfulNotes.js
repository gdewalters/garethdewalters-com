// _data/getContentfulNotes.js
// This module fetches composeNote entries from Contentful.
// It returns an array of simplified note objects.

import client from '../_helpers/contentfulClient.js';
import renderRichTextAsHtml from '../_helpers/renderRichTextAsHtml.js';
import cachedFetch from '../_helpers/cache.js';

export default async function getContentfulNotes() {
  const fetcher = async () => {
    if (!client) {
      console.error('Contentful client not configured');
      return [{ error: 'Contentful client not configured' }];
    }

    const entries = await client.getEntries({
      content_type: 'composeNote',
      order: '-fields.datePublished',
    });

    return entries.items.map(item => {
      const fields = item.fields || {};
      return {
        noteTitle: fields.noteTitle,
        externalLink: fields.externalLink,
        externalLinkLabel: fields.externalLinkLabel || fields.noteTitle, // Fallback to noteTitle if label is missing
        authorCommentary: fields.authorCommentary ? renderRichTextAsHtml(fields.authorCommentary) : null,
        datePublished: fields.datePublished || item.sys?.publishedAt || item.sys?.createdAt,
      };
    });
  };

  try {
    return await cachedFetch('contentfulNotes', fetcher);
  } catch (error) {
    console.error('Error fetching composeNote entries:', error);
    return [{ error: 'Error fetching composeNote entries', details: error.message }];
  }
}