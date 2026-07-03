require('dotenv').config();

const cron = require('node-cron');
const axios = require('axios');
const { exec } = require('child_process');
const { checkNewDubs, commitToHistory } = require('./scraper');
const { createDubEmbed } = require('./config/discordEmbed');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';
const OPEN_ON_STARTUP = process.env.OPEN_ON_STARTUP === 'true' || process.argv.includes('--open');
const OPEN_WEBPAGE_URL = process.env.OPEN_WEBPAGE_URL || 'https://www.crunchyroll.com/simulcastcalendar';

async function sendTestNotification() {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
    console.warn('Webhook URL not configured; skipping test notification.');
    return;
  }

  const testAnime = {
    title: 'Test Alert',
    episode: 'Episode 99',
    language: 'English, Thai',
    link: 'https://www.crunchyroll.com/',
    id: 'test-notification'
  };

  try {
    const webhookPayload = createDubEmbed(testAnime);
    await axios.post(DISCORD_WEBHOOK_URL, webhookPayload);
    console.log('Test notification sent successfully.');
  } catch (error) {
    console.error('Failed to send test notification:', error.message);
  }
}

async function runAutomationLoop() {
  console.log(`[${new Date().toLocaleTimeString()}] Checking for anime dub updates...`);

  if (OPEN_ON_STARTUP) {
    console.log(`Opening browser to ${OPEN_WEBPAGE_URL}`);
    openUrl(OPEN_WEBPAGE_URL);
  }

  const newReleases = await checkNewDubs();

  if (newReleases.length === 0) {
    console.log('No new updates discovered.');
    return;
  }

  console.log(`Discovered ${newReleases.length} unannounced item(s). Processing webhooks...`);

  for (const anime of newReleases) {
    try {
      if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
        console.warn(`Webhook URL not configured; skipping announcement for ${anime.title}.`);
        continue;
      }

      const webhookPayload = createDubEmbed(anime);
      console.log(`Sending webhook for: ${anime.title} - ${anime.episode} (${anime.language})`);
      await axios.post(DISCORD_WEBHOOK_URL, webhookPayload, { headers: { 'Content-Type': 'application/json' } });
      console.log(`Successfully announced: ${anime.title} - ${anime.episode} (${anime.language})`);
      commitToHistory(anime.id);
      console.log(`Stored history ID: ${anime.id}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (apiError) {
      const status = apiError.response ? apiError.response.status : null;
      const data = apiError.response ? apiError.response.data : null;
      console.error(`Failed to push notice for ${anime.title}:`, status || apiError.message, data || 'no response body');

      if (status === 400 || status === 415) {
        try {
          const fallbackPayload = {
            content: `New release: **${anime.title}**\n${anime.episode} - ${anime.language} ${anime.releaseType || 'Dub'}\n${anime.link}`
          };
          console.log(`Retrying webhook as plain content for: ${anime.title}`);
          await axios.post(DISCORD_WEBHOOK_URL, fallbackPayload, { headers: { 'Content-Type': 'application/json' } });
          console.log(`Fallback announcement succeeded for: ${anime.title}`);
          commitToHistory(anime.id);
          console.log(`Stored history ID: ${anime.id} after fallback`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        } catch (fallbackError) {
          const fallbackStatus = fallbackError.response ? fallbackError.response.status : null;
          const fallbackData = fallbackError.response ? fallbackError.response.data : null;
          console.error(`Fallback webhook also failed for ${anime.title}:`, fallbackStatus || fallbackError.message, fallbackData || 'no response body');
        }
      }
    }
  }
}

cron.schedule('*/5 * * * *', () => {
  runAutomationLoop();
});

function openUrl(url) {
  const platform = process.platform;

  if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

if (process.argv.includes('--test')) {
  sendTestNotification();
} else {
  runAutomationLoop();
  console.log('Anime Webhook Monitor Started Successfully.');
}
