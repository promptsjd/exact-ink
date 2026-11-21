
"use client";

import * as React from 'react';
import { performOcr } from '@/app/actions';
import { compareText, type ComparisonResult } from '@/lib/comparison';
import { useToast } from "@/hooks/use-toast";
import { processHighlights } from '@/lib/highlighter';
import { normalizeText } from '@/lib/normalization';
import type { ComparisonOptions } from '@/components/comparison-options-panel';

import { USAGE_LIMITS } from '@/lib/limits';

export function useProofing() {
  const [sourceCopy, setSourceCopy] = React.useState('');
  const [accessKey, setAccessKey] = React.useState('');
  const [designedFile, setDesignedFile] = React.useState<File | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [comparisonResult, setComparisonResult] = React.useState<ComparisonResult | null>(null);

  const [options, setOptions] = React.useState<ComparisonOptions>({
    spelling: true,
    added: true,
    removed: true,
    capitalization: true,
    punctuation: true,
  });

  const { toast } = useToast();

  const wordCount = React.useMemo(() => {
    return sourceCopy.trim().split(/\s+/).filter(Boolean).length;
  }, [sourceCopy]);

  const isWordLimitExceeded = React.useMemo(() => {
    return wordCount > USAGE_LIMITS.MAX_WORDS || sourceCopy.length > USAGE_LIMITS.MAX_SOURCE_CHARACTERS;
  }, [wordCount, sourceCopy]);

  const validateSourceCopy = (): boolean => {
    if (isWordLimitExceeded) {
        toast({
            variant: "destructive",
            title: "Word Limit Exceeded",
            description: `Use up to ${USAGE_LIMITS.MAX_WORDS} words and ${USAGE_LIMITS.MAX_SOURCE_CHARACTERS} characters.`,
        });
        return false;
    }
    return true;
  };

  const handleSourceCopyChange = (newText: string) => {
    setSourceCopy(newText);
    setComparisonResult(null);
  };

  const handleDesignedFileChange = (file: File | null) => {
    setDesignedFile(file);
    setComparisonResult(null);
  }

  const handleCheck = async (getProcessedImage?: () => Promise<string | null>) => {
    if (!designedFile || !sourceCopy || !getProcessedImage) return;
    if (!validateSourceCopy()) return;

    setIsLoading(true);
    setComparisonResult(null);

    try {
      const imageDataUri = await getProcessedImage();
      if (!imageDataUri) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not process the image.",
        });
        setIsLoading(false);
        return;
      }

      const result = await performOcr({ referenceImage: imageDataUri, accessKey });
      if (result.error) throw new Error(result.error);

      if (result.ocrResult && result.ocrResult.words) {
        const normalizedWords = result.ocrResult.words.map(word => ({
            ...word,
            text: normalizeText(word.text || ''),
        }));

        const normalizedSource = normalizeText(sourceCopy);

        const comparison = await compareText(normalizedSource, normalizedWords);
        setComparisonResult(comparison);
      } else {
        toast({
            variant: "destructive",
            title: "OCR Failed",
            description: "Could not extract text from the image.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      toast({
        variant: "destructive",
        title: "An Unexpected Error Occurred",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { sourceHighlights, designedHighlights } = React.useMemo(() => {
    if (!comparisonResult) return { sourceHighlights: [], designedHighlights: [] };
    return processHighlights(comparisonResult, options);
  }, [comparisonResult, options]);

  const isCheckDisabled = !designedFile || !sourceCopy || accessKey.length < 32 || isLoading || isWordLimitExceeded;

  const noDifferencesFound = React.useMemo(() => {
    if (!comparisonResult) {
      return false;
    }

    const { differences } = comparisonResult;

    const hasSpellingDiffs = options.spelling && differences.spelling.length > 0;
    const hasCapitalizationDiffs = options.capitalization && differences.capitalization.length > 0;
    const hasPunctuationDiffs = options.punctuation && differences.punctuation.length > 0;
    const hasAddedDiffs = options.added && differences.added.length > 0;
    const hasRemovedDiffs = options.removed && differences.removed.length > 0;

    return !(hasSpellingDiffs || hasCapitalizationDiffs || hasPunctuationDiffs || hasAddedDiffs || hasRemovedDiffs);

  }, [comparisonResult, options]);

  return {
    accessKey,
    setAccessKey,
    sourceCopy,
    setSourceCopy: handleSourceCopyChange,
    designedFile,
    setDesignedFile: handleDesignedFileChange,
    isLoading,
    comparisonResult,
    options,
    setOptions,
    handleCheck,
    isCheckDisabled,
    isWordLimitExceeded,
    wordCount,
    sourceHighlights,
    designedHighlights,
    noDifferencesFound,
    USAGE_LIMITS
  };
}
