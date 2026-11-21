'use server';

import { OcrFlowInputSchema, type OcrFlowInput, type OcrFlowOutput } from '@/ai/schemas';
import { createOcrBudget, isAuthorizedAccessKey, validateAndNormalizeImage } from '@/lib/ocr-security';
import { extractTextFromImage } from '@/services/vision-service';

const budget = createOcrBudget();
type PerformOcrResult =
  | { ocrResult: OcrFlowOutput; error?: never }
  | { ocrResult: null; error: string };

export async function performOcr(input: OcrFlowInput): Promise<PerformOcrResult> {
  const parsed = OcrFlowInputSchema.safeParse(input);
  if (!parsed.success || !isAuthorizedAccessKey(parsed.data.accessKey, process.env.OCR_ACCESS_KEY)) {
    return { ocrResult: null, error: 'OCR is unavailable or the access key is invalid.' };
  }
  const release = budget.reserve();
  if (!release) return { ocrResult: null, error: 'OCR usage limit reached. Please try again later.' };
  try {
    let image: Buffer;
    try {
      image = await validateAndNormalizeImage(parsed.data.referenceImage);
    } catch {
      return { ocrResult: null, error: 'Use a valid PNG or JPEG up to 5 MB and 4000 ? 4000 pixels.' };
    }
    return { ocrResult: await extractTextFromImage(image) };
  } catch {
    console.error('OCR provider request failed.');
    return { ocrResult: null, error: 'OCR could not be completed. Please try again later.' };
  } finally {
    release();
  }
}
