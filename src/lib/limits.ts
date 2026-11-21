// Shared presentation limits. The server independently validates every upload.
export const USAGE_LIMITS = {
  MAX_WORDS: 300,
  MAX_SOURCE_CHARACTERS: 10_000,
  MAX_FILE_SIZE_MB: 5,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_IMAGE_DIMENSION: 4000,
} as const;
