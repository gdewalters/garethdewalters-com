// getContentfulPageAbout.js
// This module fetches the about page from Contentful by its slug and processes it. 

import { getContentfulPageBySlug } from './getContentfulPageBySlug.js';

export default async function () {
  // See _data/models/contentfulPageEntryAbout.json for a sample entry shape.
  return getContentfulPageBySlug('about');
}
