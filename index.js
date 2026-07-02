require('dotenv').config();

const cron = require('node-cron');
const axios = require('axios');
const { checkNewDubs, commitToHistory } = require('./scraper');
const { createDubEmbed } = require('./config/discordEmbed');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'YOUR_DISCORD_WEBHOOK_URL_HERE';

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
      await axios.post(DISCORD_WEBHOOK_URL, webhookPayload);
      console.log(`Successfully announced: ${anime.title} - ${anime.episode} (${anime.language})`);

      commitToHistory(anime.id);

      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (apiError) {
      console.error(`Failed to push notice for ${anime.title}:`, apiError.message);
    }
  }
}

cron.schedule('*/5 * * * *', () => {
  runAutomationLoop();
});

if (process.argv.includes('--test')) {
  sendTestNotification();
} else {
  runAutomationLoop();
  console.log('Anime Webhook Monitor Started Successfully.');
}
