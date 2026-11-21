
/**
 * Normalizes text by replacing various typographic characters with their
 * plain ASCII equivalents. This helps standardize text from different sources
 * (e.g., user input vs. OCR output) before comparison.
 *
 * @param text The input string to normalize.
 * @returns The normalized string.
 */
export function normalizeText(text: string): string {
    if (!text) {
      return '';
    }

    return text
      // Replace various quotation marks with a standard double quote
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      // Replace various single quotation marks and apostrophes with a standard single quote
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      // Replace various dashes with a standard hyphen-minus
      .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
      // Replace horizontal ellipsis with three periods
      .replace(/\u2026/g, '...')
      // Remove bullet points
      .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '')
      // Replace other common symbols or ligatures if necessary
      .replace(/ﬁ/g, 'fi')
      .replace(/ﬂ/g, 'fl');
  }
