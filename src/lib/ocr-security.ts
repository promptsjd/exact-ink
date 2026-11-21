import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import sharp from 'sharp';
import { USAGE_LIMITS } from './limits';

export function isAuthorizedAccessKey(provided: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || expected.length > 256 ||
      provided.length < 32 || provided.length > 256) return false;
  return timingSafeEqual(
    createHash('sha256').update(provided).digest(),
    createHash('sha256').update(expected).digest(),
  );
}

export async function validateAndNormalizeImage(dataUri: string): Promise<Buffer> {
  const maxEncodedLength = Math.ceil(USAGE_LIMITS.MAX_FILE_SIZE_BYTES / 3) * 4;
  if (dataUri.length > maxEncodedLength + 64) throw new Error('Invalid image');
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUri);
  if (!match || match[2].length % 4 !== 0) throw new Error('Invalid image');
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > USAGE_LIMITS.MAX_FILE_SIZE_BYTES ||
      image.toString('base64') !== match[2]) throw new Error('Invalid image');
  const options = {
    limitInputPixels: USAGE_LIMITS.MAX_IMAGE_DIMENSION ** 2,
    failOn: 'warning' as const,
    animated: false,
  };
  const metadata = await sharp(image, options).metadata();
  if (metadata.format !== match[1] || !metadata.width || !metadata.height ||
      metadata.width > USAGE_LIMITS.MAX_IMAGE_DIMENSION ||
      metadata.height > USAGE_LIMITS.MAX_IMAGE_DIMENSION ||
      (metadata.pages ?? 1) !== 1) throw new Error('Invalid image');
  // Fully decode and re-encode before upload; strip embedded metadata.
  const normalized = await sharp(image, options).timeout({ seconds: 5 })
    .rotate().flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
  if (normalized.length > USAGE_LIMITS.MAX_FILE_SIZE_BYTES) throw new Error('Invalid image');
  return normalized;
}

// Process-local safety net for a private, single-instance app. See README for
// persistent/provider quotas required before production deployment.
export function createOcrBudget(dailyLimit = 10, minIntervalMs = 6000) {
  let day = -1;
  let count = 0;
  let active = false;
  let lastStarted = Number.NEGATIVE_INFINITY;
  return {
    reserve(now = Date.now()): (() => void) | null {
      const currentDay = Math.floor(now / 86_400_000);
      if (currentDay !== day) { day = currentDay; count = 0; }
      if (active || count >= dailyLimit || now - lastStarted < minIntervalMs) return null;
      active = true;
      count += 1;
      lastStarted = now;
      let released = false;
      return () => { if (!released) { active = false; released = true; } };
    },
  };
}
