
import type { Word } from '@/ai/schemas';
import { USAGE_LIMITS } from './limits';

/** =========================
 * Types
 * ========================= */
export type ComparisonOptions = {
    spellingThreshold?: number;       // Levenshtein max distance to call "spelling"
    preferCaseSensitiveExact?: boolean; // If true, exact case match scores slightly higher than CI
};

export type DifferenceBase = {
    source: string;
    designed: Word;
};

export type SpellingDifference = DifferenceBase;
export type CapitalizationDifference = DifferenceBase;

export type PunctuationDifference = {
    source: string | null;
    designed: Word | null;
    // This is the bounding box of the word *before* the removed punctuation.
    // We use it to position the marker on the image.
    markerPosition?: Word['boundingBox'];
};

export type AddedDifference = { token: Word };

export type RemovedDifference = {
  token: string;
  // This is the bounding box of the word *before* the removed word.
  // We use it to position the '^' marker on the image.
  markerPosition: Word['boundingBox'];
};

export type ComparisonResult = {
    differences: {
      spelling: SpellingDifference[];
      capitalization: CapitalizationDifference[];
      punctuation: PunctuationDifference[];
      added: AddedDifference[];
      removed: RemovedDifference[];
    };
    sourceTokens: string[];
    designedTokens: Word[];
};

/** =========================
 * Tokenization
 * ========================= */
type Token = {
    value: string;
    kind: "word" | "punct";
    // This is the important part: it holds the original Word object
    // for designed tokens, allowing us to trace back to the bounding box.
    original?: Word;
};

const WORD_OR_PUNCT = /([A-Za-z0-9]+|[^\s\w])/g;

// Tokenizer for the plain source text
function tokenizeSource(text: string): Token[] {
    const matches = text.match(WORD_OR_PUNCT) ?? [];
    return matches.map((t) => ({
      value: t,
      kind: /^[^\w\s]$/.test(t) ? "punct" : "word",
    }));
}

// Tokenizer for the designed text, which is already an array of Words
function tokenizeDesigned(words: Word[]): Token[] {
    const tokens: Token[] = [];
    words.forEach(word => {
        // We still need to split words from punctuation (e.g., "end.")
        // but we preserve the original Word object.
        if (!word || !word.text) return;
        const matches = word.text.match(WORD_OR_PUNCT) ?? [];
        matches.forEach(match => {
            tokens.push({
                value: match,
                kind: /^[^\w\s]$/.test(match) ? "punct" : "word",
                original: word, // Link back to the original Word object
            });
        });
    });
    return tokens;
}

/** =========================
 * Utilities
 * ========================= */
function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return dp[m][n];
}

function isCloseSpelling(a: string, b: string, threshold: number): boolean {
    if (a.length > 128 || b.length > 128) return false;
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    if (al === bl) return false; // exact word (case-insensitive) is NOT spelling
    if (Math.abs(al.length - bl.length) > threshold) return false;
    return levenshtein(al, bl) <= threshold;
}

/** =========================
 * Alignment (Needleman–Wunsch style DP)
 * ========================= */
type Cell = { score: number; from?: "diag" | "up" | "left" };

function align(
    src: Token[],
    des: Token[],
    opts: Required<Pick<ComparisonOptions, "spellingThreshold" | "preferCaseSensitiveExact">>
): Array<[Token | null, Token | null]> {
    const m = src.length;
    const n = des.length;

    const MATCH_EXACT_CS = opts.preferCaseSensitiveExact ? 6 : 5;
    const MATCH_CAPS      = 4;
    const MATCH_SPELLING  = 3;
    const MATCH_PUNCT_SAME   = 3;
    const MATCH_PUNCT_DIFF   = 1;
    const MISMATCH_WORDS     = -3;
    const MISMATCH_WORD_PUNCT= -4;
    const GAP_PENALTY        = -2;

    const dp: Cell[][] = Array.from({ length: m + 1 }, () =>
      Array.from({ length: n + 1 }, () => ({ score: 0 as number }))
    );

    for (let i = 1; i <= m; i++) dp[i][0] = { score: dp[i - 1][0].score + GAP_PENALTY, from: "up" };
    for (let j = 1; j <= n; j++) dp[0][j] = { score: dp[0][j - 1].score + GAP_PENALTY, from: "left" };

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const S = src[i - 1];
        const D = des[j - 1];

        let diagScore = Number.NEGATIVE_INFINITY;

        if (S.kind === "word" && D.kind === "word") {
          if (S.value === D.value) {
            diagScore = dp[i - 1][j - 1].score + MATCH_EXACT_CS;
          } else if (S.value.toLowerCase() === D.value.toLowerCase()) {
            diagScore = dp[i - 1][j - 1].score + MATCH_CAPS;
          } else if (isCloseSpelling(S.value, D.value, opts.spellingThreshold)) {
            diagScore = dp[i - 1][j - 1].score + MATCH_SPELLING;
          } else {
            diagScore = dp[i - 1][j - 1].score + MISMATCH_WORDS;
          }
        } else if (S.kind === "punct" && D.kind === "punct") {
          if (S.value === D.value) {
            diagScore = dp[i - 1][j - 1].score + MATCH_PUNCT_SAME;
          } else {
            diagScore = dp[i - 1][j - 1].score + MATCH_PUNCT_DIFF;
          }
        } else {
          diagScore = dp[i - 1][j - 1].score + MISMATCH_WORD_PUNCT;
        }

        const upScore = dp[i - 1][j].score + GAP_PENALTY;
        const leftScore = dp[i][j - 1].score + GAP_PENALTY;

        if (diagScore >= upScore && diagScore >= leftScore) {
          dp[i][j] = { score: diagScore, from: "diag" };
        } else if (upScore >= leftScore) {
          dp[i][j] = { score: upScore, from: "up" };
        } else {
          dp[i][j] = { score: leftScore, from: "left" };
        }
      }
    }

    const aligned: Array<[Token | null, Token | null]> = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      const cell = dp[i][j];
      if (i > 0 && j > 0 && cell.from === "diag") {
        aligned.unshift([src[i - 1], des[j - 1]]);
        i--; j--;
      } else if (i > 0 && (cell.from === "up" || j === 0)) {
        aligned.unshift([src[i - 1], null]);
        i--;
      } else if (j > 0 && (cell.from === "left" || i === 0)) {
        aligned.unshift([null, des[j - 1]]);
        j--;
      } else {
        if (i > 0) { aligned.unshift([src[i - 1], null]); i--; }
        else if (j > 0) { aligned.unshift([null, des[j - 1]]); j--; }
      }
    }

    return aligned;
}

/** =========================
 * Main
 * ========================= */
export function compareText(
    sourceText: string,
    designedWords: Word[],
    options: ComparisonOptions = {}
): ComparisonResult {

    const sourceTokens = tokenizeSource(sourceText);
    const designedTokens = tokenizeDesigned(designedWords);
    if (sourceText.length > USAGE_LIMITS.MAX_SOURCE_CHARACTERS ||
        sourceTokens.length > 1500 || designedTokens.length > 1500) {
      throw new Error('This document is too complex. Please compare a smaller section.');
    }

    const optsResolved: Required<Pick<ComparisonOptions, "spellingThreshold" | "preferCaseSensitiveExact">> = {
      spellingThreshold: options.spellingThreshold ?? 2,
      preferCaseSensitiveExact: options.preferCaseSensitiveExact ?? false,
    };

    const aligned = align(sourceTokens, designedTokens, optsResolved);

    const result: ComparisonResult = {
      differences: {
        spelling: [],
        capitalization: [],
        punctuation: [],
        added: [],
        removed: [],
      },
      sourceTokens: sourceTokens.map(t => t.value),
      designedTokens: designedWords,
    };

    let lastSeenDesignedToken: Token | null = null;

    aligned.forEach(([S, D]) => {
      // ADDED / REMOVED
      if (S && !D) { // Token was removed from the design
        const markerPosition = lastSeenDesignedToken?.original?.boundingBox;
        if (S.kind === "punct" && markerPosition) {
            result.differences.punctuation.push({ source: S.value, designed: null, markerPosition });
        } else if (S.kind === "word" && markerPosition) {
          result.differences.removed.push({
            token: S.value,
            markerPosition,
          });
        }
        return;
      }
      if (!S && D && D.original) { // Token was added to the design
        if (D.kind === "punct") {
          result.differences.punctuation.push({ source: null, designed: D.original });
        } else {
          result.differences.added.push({ token: D.original });
        }
        // Fall through to update lastSeenDesignedToken
      }

      if (!S || !D || !D.original) {
        if (D) lastSeenDesignedToken = D;
        return;
      };

      // PUNCTUATION
      if (S.kind === "punct" && D.kind === "punct") {
        if (S.value !== D.value) {
          result.differences.punctuation.push({ source: S.value, designed: D.original });
        }
        // Fall through to update lastSeenDesignedToken
      }

      // WORDS
      if (S.kind === "word" && D.kind === "word") {
        const sLower = S.value.toLowerCase();
        const dLower = D.value.toLowerCase();

        if (sLower === dLower) {
          if (S.value !== D.value) {
            result.differences.capitalization.push({ source: S.value, designed: D.original });
          }
        } else if (isCloseSpelling(S.value, D.value, optsResolved.spellingThreshold)) {
          result.differences.spelling.push({ source: S.value, designed: D.original });
        } else {
          // It's a full replacement, treat as removed then added
          if (lastSeenDesignedToken?.original?.boundingBox) {
            result.differences.removed.push({
              token: S.value,
              markerPosition: lastSeenDesignedToken.original.boundingBox
            });
          }
          result.differences.added.push({ token: D.original });
        }
        // Fall through to update lastSeenDesignedToken
      }

      if (S.kind !== D.kind) {
          result.differences.punctuation.push({
            source: S.kind === "punct" ? S.value : null,
            designed: D.kind === "punct" ? D.original : null,
            markerPosition: S.kind === 'punct' && D.kind === 'word' ? lastSeenDesignedToken?.original?.boundingBox : undefined
          });
      }

      lastSeenDesignedToken = D;
    });

    return result;
}
