// _data/getSetlistFmAttended.js
import EleventyFetch from '@11ty/eleventy-fetch';
import 'dotenv/config'; // Ensure dotenv is configured to load your env vars

export default async function getSetlistFmAttended() {
    const { SETLISTFM_API_KEY: apiKey, SETLISTFM_USERNAME: username } = process.env;

    if (!apiKey || !username) {
        console.warn('Missing SETLISTFM_API_KEY or SETLISTFM_USERNAME in .env file.');
        return {};
    }

    const url = `https://api.setlist.fm/rest/1.0/user/${username}/attended`;

    try {
        const data = await EleventyFetch(url, {
            duration: '1d', // Cache the data for 1 day
            type: 'json',
            fetchOptions: {
                headers: {
                    'x-api-key': apiKey,
                    'Accept': 'application/json'
                }
            }
        });

        const events = data.setlist || [];

        return events.reduce((acc, evt) => {
            const [day, month, year] = (evt.eventDate || '').split('-');
            if (year) {
                if (!acc[year]) acc[year] = [];
                acc[year].push(evt);
            }
            return acc;
        }, {});

    } catch (error) {
        console.error('Error fetching Setlist.fm attended events:', error);
        return {};
    }
}