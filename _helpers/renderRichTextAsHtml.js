// _helpers/renderRichTextAsHtml.js
// This module provides a function to render Contentful rich text JSON as HTML.
// It handles embedded entries and assets, converting them into appropriate HTML elements.
// It is used in the getContentfulNotes module to format author commentary and other rich text fields.
// This function fetches notes from Contentful and formats them for use in the application.

import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS } from '@contentful/rich-text-types';
import parseImageWrapper from './parseImageWrapper.js';

export default function renderRichTextAsHtml(json) {
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
      [BLOCKS.QUOTE]: (node, next) => {
        return `<blockquote class="text-muted-foreground text-base italic border-l-4 border-gray-300 pl-4 mt-4 mb-4">${next(node.content)}</blockquote>`;
      },
    },
  };

  return documentToHtmlString(json, options);
}
