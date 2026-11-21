import { z } from 'zod';
import { USAGE_LIMITS } from '@/lib/limits';

export const OcrFlowInputSchema = z.object({
  referenceImage: z.string().max(Math.ceil(USAGE_LIMITS.MAX_FILE_SIZE_BYTES / 3) * 4 + 64),
  accessKey: z.string().min(32).max(256),
}).strict();
export type OcrFlowInput = z.infer<typeof OcrFlowInputSchema>;

const VertexSchema = z.object({
  x: z.number().int().nonnegative().optional(),
  y: z.number().int().nonnegative().optional(),
});
export const WordSchema = z.object({
  text: z.string().max(10_000).optional(),
  boundingBox: z.object({ vertices: z.array(VertexSchema).max(4).optional() }).optional(),
});
export type Word = z.infer<typeof WordSchema>;
export const OcrFlowOutputSchema = z.object({
  fullText: z.string().max(100_000),
  words: z.array(WordSchema).max(1500),
});
export type OcrFlowOutput = z.infer<typeof OcrFlowOutputSchema>;
