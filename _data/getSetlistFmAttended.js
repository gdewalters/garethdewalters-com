// _data/getSetlistFmAttended.js
// Fetches attended events from Setlist.fm and groups them by year.

import cachedFetch from '../_helpers/cache.js';

export default async function getSetlistFmAttended() {
  const { SETLISTFM_API_KEY: apiKey, SETLISTFM_USERNAME: username } = process.env;

  if (!apiKey || !username) {
    console.warn('Missing SETLISTFM_API_KEY or SETLISTFM_USERNAME');
    return {};
  }

  const fetcher = async () => {
    const url = `https://api.setlist.fm/rest/1.0/user/${username}/attended`;
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Setlist.fm attended events: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.setlist || data.setlists?.setlist || [];

    return events.reduce((acc, evt) => {
      const [day, month, year] = (evt.eventDate || '').split('-');
      if (year) {
        if (!acc[year]) acc[year] = [];
        acc[year].push(evt);
      }
      return acc;
    }, {});
  };

  try {
    return await cachedFetch('setlistfm-attended', fetcher);
  } catch (error) {
    console.error('Error fetching Setlist.fm attended events:', error);
    return {};
  }
}
