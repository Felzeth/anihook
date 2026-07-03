# Crunchyroll Release Tracker

A simple Node.js bot that monitors Crunchyroll's simulcast calendar and posts new dub release announcements to a Discord webhook.

## Features

- Authenticated Crunchyroll scraping using `etp_rt`, `etp_jwt`, and optional extra cookie support
- Filters for title and language matching
- Exclude specific languages from announcements
- Deduplicates announced releases using local history
- Posts notifications as Discord webhook embeds
- Supports opening a webpage on startup for debugging

## Requirements

- Node.js 18+ (recommended)
- A Discord webhook URL
- Crunchyroll session cookies for authenticated scraping

## Installation

```bash
cd "c:\Users\opal\Downloads\anihook"
npm install
```

## Configuration

Copy the sample environment file:

```bash
copy .env.example .env
```

Then fill in the values:

- `DISCORD_WEBHOOK_URL` - your Discord webhook URL
- `CRUNCHYROLL_ETP_RT` - Crunchyroll `etp_rt` cookie value
- `CRUNCHYROLL_ETP_JWT` - Crunchyroll `etp_jwt` cookie value
- `OPEN_ON_STARTUP` - `true` or `false`
- `OPEN_WEBPAGE_URL` - optional URL to open on startup

## Filters

Edit `settings.js` to control what gets announced.

```js
module.exports = {
  titleIncludes: [
    // names of shows to include
  ],
  languageIncludes: ["Português", "English"],
  languageExcludes: ["हिंदी", "தமிழ்", "తెలుగు", "Bahasa Indonesia"],
  requireBothFilters: false,
};
```

- `titleIncludes` filters release titles
- `languageIncludes` filters detected language markers
- `languageExcludes` blocks unwanted languages
- `requireBothFilters` determines whether both title and language filters must match

## Usage

Start the bot:

```bash
npm start
node index.js
```

Send a test notification:

```bash
npm run test
```

## How it works

- `index.js` runs the scheduler and sends webhooks
- `scraper.js` fetches the Crunchyroll simulcast calendar HTML and parses release entries
- `config/discordEmbed.js` formats Discord embed payloads
- `history.json` stores announced release IDs to prevent duplicates

## Notes

- Authenticated scraping is required because Crunchyroll may hide calendar content when not logged in
- The bot now infers dub content from titles like `(Português)` and `(English)` and maps them to dub announcements
- If a release is blocked by `languageExcludes`, it will not be announced

## License

MIT
