// _data/getContentfulNotes.js
// This module fetches composeNote entries from Contentful.
// It returns an array of simplified note objects.

import client from '../_helpers/contentfulClient.js';
import cachedFetch from '../_helpers/cache.js';
import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS } from '@contentful/rich-text-types';
import parseImageWrapper from '../_helpers/parseImageWrapper.js';

export default async function getContentfulNotes() {
  const fetcher = async () => {
    const entries = await client.getEntries({
      content_type: 'composeNote',
      order: '-sys.publishedAt',
    });

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
      },
    };

    return entries.items.map(item => {
      const fields = item.fields || {};
      const authorCommentaryHtml = fields.authorCommentary
        ? documentToHtmlString(fields.authorCommentary, options)
        : null;
      return {
        noteTitle: fields.noteTitle,
        externalLink: fields.externalLink,
        authorCommentary: fields.authorCommentary,
        authorCommentaryHtml,
        date: item.sys?.publishedAt || item.sys?.createdAt,
      };
    });
  };

  try {
    return await cachedFetch('contentfulNotes', fetcher);
  } catch (error) {
    console.error('Error fetching composeNote entries:', error);
    return [];
  }
}
