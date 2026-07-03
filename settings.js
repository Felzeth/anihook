module.exports = {
  // Only announce releases that match these filters.
  // Leave arrays empty to announce everything.

  // Match release titles (case-insensitive) if they include any of these strings.
  titleIncludes: [
    // Example:
    // 'Karna The Guardian',
    // 'X: The Movie',
  ],

  // Match release languages (case-insensitive) if they include any of these strings.
  languageIncludes: [
    // Example:
    // 'English',
    // 'Italiano',
    // 'Русский'
  ],

  // Match release languages to exclude. Any match here will prevent announcement.
  languageExcludes: [
    // Example:
    // 'हिंदी',
    // 'தமிழ்',
    // 'తెలుగు',
    // 'Bahasa Indonesia'
    //leave it blank if you want to announce all languages, or add more languages to exclude them from announcements
  ],

  // If true, both title and language filters must match.
  // If false, a release matches if it satisfies either filter.
  requireBothFilters: false,
};
