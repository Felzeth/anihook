/**
 * Formats scraped anime data into a sleek Discord Webhook Embed payload.
 * @param {Object} anime - The parsed anime object from the scraper.
 * @param {string} anime.title - The main show title.
 * @param {string} anime.episode - The episode number or title identifier.
 * @param {string} anime.language - The detected dub language (for example, "English").
 * @param {string} anime.link - Direct URL to the episode on Crunchyroll.
 * @returns {Object} Complete Discord webhook payload.
 */
function createDubEmbed(anime) {
  const releaseTypeLabel = anime.releaseType && anime.releaseType !== 'Unknown'
    ? anime.releaseType
    : (anime.language && anime.language !== 'Unknown' ? 'Dub' : 'Release');
  const audioLabel = anime.language && anime.language !== 'Unknown'
    ? `${anime.language} ${releaseTypeLabel}`
    : releaseTypeLabel;

  return {
    //content: `you can add this to the message if you want to ping a role or user.`,
    embeds: [
      {
        title: anime.title,
        description: `### **${anime.episode}** is now available!`,
        url: anime.link || 'https://www.crunchyroll.com',
        color: 16020769,
        timestamp: new Date().toISOString(),
        thumbnail: {
          url: 'https://www.crunchyroll.com/imgs/landing/crunchyroll-logo.png'
        },
        fields: [
          {
            name: '🔊 Audio Track',
            value: `\`${audioLabel}\``,
            inline: true
          },
          {
            name: '📺 Platform',
            value: '🟢 Crunchyroll',
            inline: true
          }
        ],
        footer: {
          text: 'Anime Dub Tracker • Live Updates',
          icon_url: 'https://www.crunchyroll.com/build/assets/img/favicons/apple-touch-icon-v2-114x114.png'
        }
      }
    ]
  };
}

module.exports = { createDubEmbed };
