// getContentfulPageHome.js
// This module fetches the home page from Contentful by its slug and processes it.
// It uses the getContentfulPageBySlug function to retrieve the page data.
// The home page is expected to have a specific content type and structure.   

import { getContentfulPageBySlug } from './getContentfulPageBySlug.js';

export default async function () {
  return getContentfulPageBySlug('/');
}
