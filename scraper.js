const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'history.json');

function buildSeriesLink(relativeLink, baseTitle) {
  if (!relativeLink) {
    return 'https://www.crunchyroll.com';
  }

  const normalizedLink = relativeLink.startsWith('http') ? relativeLink : `https://www.crunchyroll.com${relativeLink}`;

  try {
    const url = new URL(normalizedLink);

    if (url.pathname.includes('/series/')) {
      return url.toString();
    }

    const watchMatch = url.pathname.match(/\/watch\/([A-Za-z0-9]+)/);
    if (watchMatch) {
      const seriesId = watchMatch[1];
      const slugFromPath = url.pathname.split('/').filter(Boolean).slice(2).join('/');
      const slug = slugFromPath && !slugFromPath.includes('episode')
        ? slugFromPath
        : baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (slug) {
        return `https://www.crunchyroll.com/series/${seriesId}/${slug}`;
      }

      return `https://www.crunchyroll.com/series/${seriesId}`;
    }

    return url.toString();
  } catch (error) {
    return normalizedLink;
  }
}

/**
 * Fetches the calendar and screens for unannounced dub components.
 * @returns {Promise<Array>} Array of clean, unannounced anime objects.
 */
async function checkNewDubs() {
  try {
    const { data: html } = await axios.get('https://www.crunchyroll.com/simulcastcalendar', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    const $ = cheerio.load(html);
    const discoveredDubs = [];

    let history = [];
    if (fs.existsSync(CACHE_PATH)) {
      history = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }

    $('.calendar-day-time-template').each((_, element) => {
      const fullTitleText = $(element).find('.js-short-video-carousel-title').text().trim();
      const episodeText = $(element).find('.js-board-episode-number').text().trim() || 'New Episode';
      const relativeLink = $(element).find('.js-link-card').attr('href') || '';

      const languageMatch = fullTitleText.match(/\(([^)]+)\)$/);

      if (languageMatch) {
        const language = languageMatch[1];
        const baseTitle = fullTitleText.replace(/\([^)]+\)$/, '').trim();
        const uniqueStorageKey = `${baseTitle}-${episodeText}-${language}`.toLowerCase().replace(/\s+/g, '-');

        if (!history.includes(uniqueStorageKey)) {
          discoveredDubs.push({
            id: uniqueStorageKey,
            title: baseTitle,
            episode: episodeText,
            language,
            link: buildSeriesLink(relativeLink, baseTitle)
          });
        }
      }
    });

    return discoveredDubs;
  } catch (error) {
    console.error('Scraper execution failure:', error.message);
    return [];
  }
}

/**
 * Persists a unique record ID to local storage state.
 * @param {string} id - The string element to cache.
 */
function commitToHistory(id) {
  let history = [];
  if (fs.existsSync(CACHE_PATH)) {
    history = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  }

  history.push(id);

  if (history.length > 200) {
    history.shift();
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(history, null, 2));
}

module.exports = { checkNewDubs, commitToHistory };
