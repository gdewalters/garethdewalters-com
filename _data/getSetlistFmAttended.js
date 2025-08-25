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

    while (hasMorePages) {
        const url = `https://api.setlist.fm/rest/1.0/user/${username}/attended?p=${page}`;

        try {
            const data = await EleventyFetch(url, {
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