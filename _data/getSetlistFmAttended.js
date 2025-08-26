// _data/getSetlistFmAttended.js
import EleventyFetch from '@11ty/eleventy-fetch';
import 'dotenv/config';

export default async function getSetlistFmAttended() {
    const { SETLISTFM_API_KEY: apiKey, SETLISTFM_USERNAME: username } = process.env;

    if (!apiKey || !username) {
        console.warn('Missing SETLISTFM_API_KEY or SETLISTFM_USERNAME in .env file.');
        return {};
    }

    const allEvents = [];
    let page = 1;
    let hasMorePages = true;

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1300;

    const fetchWithRetry = async (url, options) => {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await EleventyFetch(url, options);
            } catch (error) {
                if (attempt === MAX_RETRIES) throw error;

                const status = error?.response?.status;
                const retryAfter = Number(error?.response?.headers?.get('retry-after')) * 1300 || RETRY_DELAY_MS;

                if (status === 429) {
                    console.warn(`Rate limited fetching ${url}. Retrying in ${retryAfter}ms`);
                    await new Promise((resolve) => setTimeout(resolve, retryAfter));
                } else {
                    console.warn(`Error fetching ${url}. Retrying in ${RETRY_DELAY_MS}ms`);
                    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }
    };

    while (hasMorePages) {
        const url = `https://api.setlist.fm/rest/1.0/user/${username}/attended?p=${page}`;

        try {
            const data = await fetchWithRetry(url, {
                duration: '1d', // Cache for 1 day
                type: 'json',
                fetchOptions: {
                    headers: {
                        'x-api-key': apiKey,
                        'Accept': 'application/json'
                    }
                }
            });

            const events = data.setlist || [];
            allEvents.push(...events);

            // Check if there are more pages to fetch.
            // If the number of events is less than the itemsPerPage, it's the last page.
            if (events.length < data.itemsPerPage) {
                hasMorePages = false;
            } else {
                page++;
            }

        } catch (error) {
            console.error(`Error fetching Setlist.fm attended events on page ${page}:`, error);
            hasMorePages = false; // Stop the loop on error to prevent infinite retries.
        }
    }
    
    // Group all collected events by year.
    return allEvents.reduce((acc, evt) => {
        const [day, month, year] = (evt.eventDate || '').split('-');
        if (year) {
            if (!acc[year]) acc[year] = [];
            acc[year].push(evt);
        }
        return acc;
    }, {});
}