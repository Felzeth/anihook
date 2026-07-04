# Language Filters Reference Guide

This guide shows you the **exact language strings** extracted by the scraper and how to add them to your `settings.js` file.

## How Scraper Extracts Languages

The scraper extracts language from the release title, typically in format: `Title (Language Dub)` or `Title (Language)`.

### Actual Languages From Your history.json:

- `"english-dub"` (English dubs)
- `"ไทย-dub"` (Thai dubs)
- `"unknown-unknown"` (Unable to determine language)

### Other Common Languages You May Encounter:

- `"español américa latina dub"` (Spanish Latin America)
- `"português brasil dub"` (Portuguese Brazil)
- `"french-dub"` (French)
- `"german-dub"` (German)

---

## Common Languages Already Configured

### Current Excludes (in `settings.js`):

```javascript
languageExcludes: [
  "हिंदी",
  "தமிழ்",
  "తెలుగు",
  "Bahasa Indonesia",
  "português brasil",
  "español américa latina",
];
```

### Current Includes (in `settings.js`):

```javascript
languageIncludes: ["ไทย", "English"];
```

---

## How to Add More Languages

### To EXCLUDE a language (prevent announcements):

Add the language string to `languageExcludes` array:

```javascript
languageExcludes: [
  "existing entries...",
  "french", // Will exclude French dubs
  "german", // Will exclude German dubs
  "japanese", // Will exclude Japanese releases
];
```

**Examples of strings to exclude:**
| Language | Add to Excludes |
|----------|-----------------|
| English Dub | `'english-dub'` |
| Thai Dub | `'ไทย-dub'` |
| Spanish Latin America | `'español américa latina dub'` |
| Portuguese Brazil | `'português brasil dub'` |
| French Dub | `'french-dub'` |
| German Dub | `'german-dub'` |
| Unknown | `'unknown-unknown'` or `'unknown'` |

### To INCLUDE only specific languages:

Add the language string to `languageIncludes` array. When this array is not empty, **only** releases matching these languages will be announced:

```javascript
languageIncludes: ["english", "ไทย", "spanish"];
```

**Note:** If `languageIncludes` is empty `[]`, ALL languages are allowed (except those in `languageExcludes`).

---

## Finding the Exact Language String

If you're unsure of the exact format, check your `history.json` file to see what strings are being stored.

Example from history.json:

```json
{
  "id": "rilakkuma-season-1-episode-14-english-dub",
  "title": "RILAKKUMA Season 1",
  "episode": "Episode 14",
  "language": "English dub",
  "releaseType": "Dub",
  "link": "..."
}
```

The `"language"` field shows the **exact string** to use in your filters!

---

## Quick Tips

1. **Case-insensitive:** `'English'`, `'english'`, and `'ENGLISH'` all work the same
2. **Partial matching:** If you add `'español'`, it will match `'español méxico'`, `'español españa'`, `'español américa latina'`, etc.
3. **Be specific:** Use `'português brasil'` to match only Brazil Portuguese, not all Portuguese
4. **Test:** Run the scraper and check `history.json` to confirm your language strings are correct

---

## Example Configurations

### Only English Dubs

```javascript
languageIncludes: ["english-dub"];
languageExcludes: [];
```

### Only Thai Dubs

```javascript
languageIncludes: ["ไทย-dub"];
languageExcludes: [];
```

### Both Thai & English Dubs

```javascript
languageIncludes: ["ไทย-dub", "english-dub"];
languageExcludes: [];
```

### Exclude Unknown Languages

```javascript
languageIncludes: []; // Empty = allow all
languageExcludes: ["unknown-unknown"];
```

### All Languages EXCEPT Spanish Latin America & Portuguese Brazil

```javascript
languageIncludes: []; // Empty = allow all
languageExcludes: ["português brasil dub", "español américa latina dub"];
```
