import 'server-only';

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { OcrFlowOutputSchema, type OcrFlowOutput } from '@/ai/schemas';

// Use Application Default Credentials configured outside the repository.
let client: ImageAnnotatorClient | undefined;

export async function extractTextFromImage(image: Buffer): Promise<OcrFlowOutput> {
  client ??= new ImageAnnotatorClient();
  const [response] = await client.batchAnnotateImages({
    requests: [{
      image: { content: image },
      features: [{ type: 'TEXT_DETECTION' }],
      imageContext: { languageHints: ['en'] },
    }],
  }, { timeout: 15_000, retry: null });
  const result = response.responses?.[0];
  if (!result) throw new Error('OCR provider returned no response');
  if (result.error?.code) throw new Error('OCR provider failed');
  const detections = result.textAnnotations ?? [];
  return OcrFlowOutputSchema.parse({
    fullText: detections[0]?.description ?? '',
    words: detections.slice(1).map(annotation => ({
      text: annotation.description ?? '',
      boundingBox: annotation.boundingPoly?.vertices ? {
        vertices: annotation.boundingPoly.vertices.map(vertex => ({
          x: vertex.x ?? 0,
          y: vertex.y ?? 0,
        })),
      } : undefined,
    })),
  });
}
