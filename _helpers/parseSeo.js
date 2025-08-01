// _helpers/parseSeo.js
// This function parses SEO-related fields from an entry object
// and returns an object with the relevant SEO properties.
// It handles both the presence and absence of fields gracefully.

import parseImageWrapper from './parseImageWrapper.js';

export default function parseSeo(entry) {
  const fields = entry?.fields || {};

  return {
    seoTitle: fields.seoTitle || null,
    metaDescription: fields.metaDescription || null,
    canonicalUrl: fields.canonicalUrl || null,
    seoNoIndex: fields.seoNoIndex ?? null,
    seoNoFollow: fields.seoNoFollow ?? null,
    openGraphTitle: fields.openGraphTitle || null,
    openGraphDescription: fields.openGraphDescription || null,
    openGraphImage: parseImageWrapper(fields.openGraphImage),
    openGraphType: fields.openGraphType || null,
    openGraphLocale: fields.openGraphLocale || null,
  };
}

