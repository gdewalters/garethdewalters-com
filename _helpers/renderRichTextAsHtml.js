// _helpers/renderRichTextAsHtml.js
// This module provides a function to render Contentful rich text JSON as HTML.
// It handles embedded entries and assets, converting them into appropriate HTML elements.

import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import { BLOCKS } from '@contentful/rich-text-types';
import parseImageWrapper from './parseImageWrapper.js';
import parseVideoWrapper from './parseVideoWrapper.js';

export default function renderRichTextAsHtml(json) {
  const options = {
    renderNode: {
      [BLOCKS.EMBEDDED_ENTRY]: (node) => {
        const entry = node.data.target;

        // Images
        if (entry?.sys?.contentType?.sys?.id === 'mediaImageAsset') {
          const img = parseImageWrapper(entry);
          if (img) {
            // Full width of container, responsive height, lazy + async
            return `
              <figure>
                <img class="w-full h-auto"
                     src="${img.url}"
                     alt="${img.alt ?? ''}"
                     loading="lazy"
                     decoding="async">
                ${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}
              </figure>
            `;
          }
        }

        // Videos (YouTube, Vimeo, etc.)
        if (entry?.sys?.contentType?.sys?.id === 'mediaVideoAsset') {
          const video = parseVideoWrapper(entry);
          if (video) {
            // If your entry stores width/height, use a precise ratio:
            // const aspect = video.width && video.height ? `aspect-[${video.width}/${video.height}]` : 'aspect-video';
            const aspect = 'aspect-video';

            // Use a positioned wrapper so the iframe can fill it
            return `
              <figure class="not-prose">
                <div class="relative w-full ${aspect}">
                  <iframe
                    class="absolute inset-0 h-full w-full"
                    src="${video.url}"
                    title="${video.title ?? ''}"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                  </iframe>
                </div>
                ${video.caption ? `<figcaption class="prose">${video.caption}</figcaption>` : ''}
              </figure>
            `;
          }
        }

        return '';
      },

      // Raw assets fallback (images uploaded directly as assets)
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const asset = node.data.target;
        const url = asset?.fields?.file?.url ? `https:${asset.fields.file.url}` : '';
        const alt = asset?.fields?.title || '';
        return url
          ? `<img class="w-full h-auto" src="${url}" alt="${alt}" loading="lazy" decoding="async">`
          : '';
      },

      [BLOCKS.QUOTE]: (node, next) => {
        return `<blockquote>${next(node.content)}</blockquote>`;
      },
    },
  };

  return documentToHtmlString(json, options);
}
