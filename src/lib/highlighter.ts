
import type { ComparisonResult } from './comparison';
import type { Word } from '@/ai/schemas';
import type { ComparisonOptions } from '@/components/comparison-options-panel';

export type SourceHighlight = {
  startIndex: number;
  endIndex: number;
  className: string;
};

type DifferenceType = 'spelling' | 'capitalization' | 'punctuation' | 'added' | 'removed';

export type DesignedHighlight = {
  boundingBox?: Word['boundingBox'];
  type: DifferenceType;
  isRemovalMarker?: boolean;
  isPunctuationRemovalMarker?: boolean;
};

export function processHighlights(
  comparisonResult: ComparisonResult,
  options: ComparisonOptions,
) {
  const sourceHighlights: SourceHighlight[] = [];
  const designedHighlights: DesignedHighlight[] = [];

  if (!comparisonResult) {
    return { sourceHighlights, designedHighlights };
  }

  const { differences } = comparisonResult;

  // --- Spelling ---
  if (options.spelling) {
    differences.spelling.forEach(diff => {
      designedHighlights.push({ boundingBox: diff.designed.boundingBox, type: 'spelling' });
    });
  }

  // --- Capitalization ---
  if (options.capitalization) {
    differences.capitalization.forEach(diff => {
      designedHighlights.push({ boundingBox: diff.designed.boundingBox, type: 'capitalization' });
    });
  }

  // --- Punctuation ---
  if (options.punctuation) {
    differences.punctuation.forEach(diff => {
      if (diff.designed) {
        // This is an added or replaced punctuation mark
        designedHighlights.push({ boundingBox: diff.designed.boundingBox, type: 'punctuation' });
      } else if (diff.markerPosition) {
        // This is a removed punctuation mark
        designedHighlights.push({
          boundingBox: diff.markerPosition,
          type: 'punctuation',
          isPunctuationRemovalMarker: true
        });
      }
    });
  }

  // --- Added ---
  if (options.added) {
    differences.added.forEach(diff => {
        designedHighlights.push({ boundingBox: diff.token.boundingBox, type: 'added' });
    });
  }

  // --- Removed ---
  if (options.removed) {
    differences.removed.forEach(diff => {
      // Create a highlight with a special flag for removal markers.
      // The bounding box will be used to position the '^' character.
      designedHighlights.push({
        boundingBox: diff.markerPosition,
        type: 'removed',
        isRemovalMarker: true
      });
    });
  }

  return { sourceHighlights, designedHighlights };
}
