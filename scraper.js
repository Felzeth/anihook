const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'history.json');
const CRUNCHYROLL_ETP_RT = process.env.CRUNCHYROLL_ETP_RT || '';
const CRUNCHYROLL_ETP_JWT = process.env.CRUNCHYROLL_ETP_JWT || '';
const CRUNCHYROLL_COOKIES = process.env.CRUNCHYROLL_COOKIES || process.env.CRUNCHYROLL_COOKIE || '';
const CRUNCHYROLL_PUBLIC_FEED_URL = process.env.CRUNCHYROLL_PUBLIC_FEED_URL || '';
const { titleIncludes, languageIncludes, languageExcludes, requireBothFilters } = require('./settings');

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

function buildRequestHeaders() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  const cookieHeader = [];
  if (CRUNCHYROLL_ETP_RT) {
    cookieHeader.push(`etp_rt=${CRUNCHYROLL_ETP_RT}`);
  }
  if (CRUNCHYROLL_ETP_JWT) {
    cookieHeader.push(`etp_jwt=${CRUNCHYROLL_ETP_JWT}`);
  }
  if (CRUNCHYROLL_COOKIES) {
    cookieHeader.push(CRUNCHYROLL_COOKIES);
  }

  if (cookieHeader.length > 0) {
    headers.Cookie = cookieHeader.join('; ');
  }

  return headers;
}

function loadHistory() {
  if (!fs.existsSync(CACHE_PATH)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch (error) {
    console.warn('Failed to parse history cache, resetting:', error.message);
    return [];
  }
}

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function dedupeRepeatedPhrase(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  for (let len = 1; len <= Math.floor(words.length / 2); len += 1) {
    const first = words.slice(0, len).join(' ').toLowerCase();
    const second = words.slice(len, len * 2).join(' ').toLowerCase();
    if (first && first === second) {
      return normalizeText(words.slice(0, len).join(' '));
    }
  }
  return normalized;
}

function detectReleaseType(fullTitleText, rawText, altLangText) {
  const combined = [fullTitleText, rawText, altLangText].filter(Boolean).join(' ').toLowerCase();
  const hasDub = /\b(dub|dubbed)\b/.test(combined);
  const hasSub = /\b(sub|subbed|subtitled)\b/.test(combined);

  if (hasSub && !hasDub) return 'Sub';
  if (hasDub) return 'Dub';

  const dubLanguageMarkers = [
    'ไทย',
    'english',
    'हिंदी',
    'தமிழ்',
    'తెలుగు',
    'bahasa indonesia',
    'español',
    'français',
    'deutsch',
    'português'
  ];

  if (dubLanguageMarkers.some(marker => combined.includes(marker))) {
    return 'Dub';
  }

  return 'Unknown';
}

function extractLanguage(fullTitleText, altLangText) {
  const match = fullTitleText.match(/\(([^)]+)\)/);
  let languageCandidate = match ? match[1] : (altLangText || '');

  languageCandidate = languageCandidate
    .replace(/\b(dub|dubbed|sub|subbed|subtitled)\b/gi, '')
    .replace(/[()]/g, '')
    .replace(/[,\/]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return languageCandidate || 'Unknown';
}

function extractTitle(rawText) {
  const cleaned = normalizeText(rawText)
    .replace(/Premiere/gi, '')
    .replace(/In Queue/gi, '')
    .replace(/Available/gi, '')
    .replace(/Play Video/gi, '')
    .replace(/Premium Only/gi, '')
    .replace(/Progress:\s*\d+%/gi, '')
    .replace(/Episode\s*\d+/gi, '')
    .replace(/Ep(?:isode)?\s*\d+/gi, '')
    .replace(/#\d+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const deduped = dedupeRepeatedPhrase(cleaned);
  const parts = deduped.split(/\s{2,}| - |\|/).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return deduped;
}

function parseItem(element, history) {
  const rawText = normalizeText(element.text());
  let fullTitleText = normalizeText(element.find('.js-short-video-carousel-title, .title, .release-title, .video-name, .video-title, .show-title, h1, h2, h3').text()) || rawText;

  if (!fullTitleText) {
    fullTitleText = rawText;
  }

  const titleCandidate = extractTitle(fullTitleText);
  const episodeText = element.find('.js-board-episode-number, .episode, .release-episode, .episode-number, .video-episode').text().trim() ||
    (rawText.match(/(Episode\s*\d+|Ep(?:isode)?\s*\d+|#\d+)/i) || [])[0] ||
    'New Episode';
  const relativeLink = element.find('a').attr('href') || '';

  const altLang = element.find('.badge, .day-language, .js-language, .language-badge, .media-language, .language').text().trim();
  const language = extractLanguage(fullTitleText, altLang);
  const releaseType = detectReleaseType(fullTitleText, rawText, altLang);

  const baseTitle = titleCandidate.replace(/\([^)]+\)$/, '').trim();
  const uniqueStorageKey = `${baseTitle}-${episodeText}-${language}-${releaseType}`.toLowerCase().replace(/\s+/g, '-');

  if (!history.includes(uniqueStorageKey) && baseTitle) {
    return {
      id: uniqueStorageKey,
      title: baseTitle,
      rawTitle: fullTitleText,
      episode: episodeText,
      language,
      releaseType,
      link: buildSeriesLink(relativeLink, baseTitle)
    };
  }

  return null;
}

function matchesFilter(text, filters) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return true;
  }

  const normalized = text.toLowerCase();
  return filters.some(filter => normalized.includes(filter.toLowerCase()));
}

function shouldTrackRelease(release) {
  const titleMatches = matchesFilter(release.title, titleIncludes) || matchesFilter(release.releaseType, titleIncludes);
  const languageMatches = matchesFilter(release.language, languageIncludes) || matchesFilter(release.releaseType, languageIncludes);
  const excludeMatches = matchesFilter(release.language, languageExcludes) || matchesFilter(release.rawTitle || release.title, languageExcludes);

  if (excludeMatches) {
    return false;
  }

  if (titleIncludes.length === 0 && languageIncludes.length === 0) {
    return true;
  }

  if (requireBothFilters) {
    return titleMatches && languageMatches;
  }

  return titleMatches || languageMatches;
}

function parseCalendar(html, history) {
  const $ = cheerio.load(html);
  const discoveredDubs = [];

  $('.day.active.today .releases li').each((_, element) => {
    const item = parseItem($(element), history);
    if (item && shouldTrackRelease(item)) discoveredDubs.push(item);
  });

  if (discoveredDubs.length === 0) {
    $('.calendar-day-time-template').each((_, element) => {
      const item = parseItem($(element), history);
      if (item && shouldTrackRelease(item)) discoveredDubs.push(item);
    });
  }

  return discoveredDubs;
}

async function fetchHtml(url) {
  const options = {
    headers: buildRequestHeaders(),
    timeout: 20000,
    maxRedirects: 5
  };

  if (CRUNCHYROLL_COOKIES) {
    console.log('Scraper: using authenticated Crunchyroll cookie header.');
  } else {
    console.warn('Scraper: no Crunchyroll cookies configured; authenticated scraping may fail.');
  }

  const response = await axios.get(url, options);
  return response.data;
}

async function tryFallbackFeed(history) {
  if (!CRUNCHYROLL_PUBLIC_FEED_URL) {
    return [];
  }

  try {
    console.log('Scraper: trying public fallback feed:', CRUNCHYROLL_PUBLIC_FEED_URL);
    const html = await axios.get(CRUNCHYROLL_PUBLIC_FEED_URL, { headers: buildRequestHeaders(), timeout: 20000 }).then(res => res.data);
    const items = parseCalendar(html, history);
    if (items.length > 0) {
      console.log(`Fallback feed returned ${items.length} item(s).`);
    } else {
      console.warn('Fallback feed returned no items.');
    }
    return items;
  } catch (error) {
    console.warn('Fallback feed fetch failed:', error.message);
    return [];
  }
}

async function checkNewDubs() {
  const history = loadHistory();
  let discoveredDubs = [];

  try {
    const html = await fetchHtml('https://www.crunchyroll.com/simulcastcalendar');
    discoveredDubs = parseCalendar(html, history);

    if (discoveredDubs.length === 0) {
      if (!CRUNCHYROLL_COOKIES) {
        console.warn('Scraper: authenticated page unavailable without cookies.');
      } else {
        console.warn('Scraper: no items found in Crunchyroll response. Cookies may be invalid or the page structure has changed.');
      }
    }
  } catch (error) {
    console.warn('Primary Crunchyroll fetch failed:', error.message);
  }

  if (discoveredDubs.length === 0) {
    discoveredDubs = await tryFallbackFeed(history);
  }

  if (discoveredDubs.length > 0) {
    console.log(`Scraper: found ${discoveredDubs.length} new item(s):`, discoveredDubs.map(d => d.id));
  }

  return discoveredDubs;
}

/**
 * Persists a unique record ID to local storage state.
 * @param {string} id - The string element to cache.
 */
function commitToHistory(id) {
  const history = loadHistory();
  history.push(id);

  if (history.length > 200) {
    history.shift();
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(history, null, 2));
}

module.exports = { checkNewDubs, commitToHistory };
