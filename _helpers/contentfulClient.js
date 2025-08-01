// _data/helpers/contentfulClient.js    
// This file sets up the Contentful client using environment variables
// It exports the client for use in other parts of the application.

import { createClient } from 'contentful';
import 'dotenv/config'; // Ensure dotenv is configured to load your env vars

const {
  CONTENTFUL_SPACE_ID,
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_ENVIRONMENT,
} = process.env;

if (!CONTENTFUL_SPACE_ID || !CONTENTFUL_ACCESS_TOKEN) {
  console.warn(
    'Missing Contentful credentials. Set CONTENTFUL_SPACE_ID and CONTENTFUL_ACCESS_TOKEN in your environment variables.'
  );
}

const client =
  CONTENTFUL_SPACE_ID && CONTENTFUL_ACCESS_TOKEN
    ? createClient({
        space: CONTENTFUL_SPACE_ID,
        accessToken: CONTENTFUL_ACCESS_TOKEN,
        environment: CONTENTFUL_ENVIRONMENT || 'master',
      })
    : null;

export default client;
