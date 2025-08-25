//  getContentfulPageWriting.js
// This module fetches the writing page from Contentful by its slug and processes it.            

import { getContentfulPageBySlug } from './getContentfulPageBySlug.js';

export default async function () {
  return getContentfulPageBySlug('currently');
}
