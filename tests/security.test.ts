import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import { createOcrBudget, isAuthorizedAccessKey, validateAndNormalizeImage } from '../src/lib/ocr-security';
import { OcrFlowInputSchema } from '../src/ai/schemas';
import { compareText } from '../src/lib/comparison';
import { performOcr } from '../src/app/actions';

const accessKey = 'test-only-value-'.repeat(4);
const toDataUri = (bytes: Buffer, type = 'png') => `data:image/${type};base64,${bytes.toString('base64')}`;

test('OCR fails closed for absent, weak, or incorrect access keys', () => {
  assert.equal(isAuthorizedAccessKey(accessKey, undefined), false);
  assert.equal(isAuthorizedAccessKey('', ''), false);
  assert.equal(isAuthorizedAccessKey('short', 'short'), false);
  assert.equal(isAuthorizedAccessKey('different-key-'.repeat(4), accessKey), false);
  assert.equal(isAuthorizedAccessKey(accessKey, accessKey), true);
  assert.equal(OcrFlowInputSchema.safeParse({ referenceImage: 'x' }).success, false);
  assert.equal(OcrFlowInputSchema.safeParse({ referenceImage: 'x', accessKey, extra: true }).success, false);
});

test('image validation decodes a valid image and strips metadata', async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } })
    .withMetadata({ orientation: 1 }).png().toBuffer();
  const result = await validateAndNormalizeImage(toDataUri(png));
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 8);
  assert.equal(metadata.height, 8);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
});

test('image validation rejects disguised, corrupt, unsupported and oversized inputs', async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toBuffer();
  const oversized = await sharp({ create: { width: 4001, height: 1, channels: 3, background: 'white' } }).png().toBuffer();
  for (const value of [
    toDataUri(png, 'jpeg'),
    toDataUri(Buffer.from('not an image')),
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,!!!!',
    'data:image/png;base64,AAAA====',
    toDataUri(png.subarray(0, 30)),
    toDataUri(oversized),
    'data:image/png;base64,' + 'A'.repeat(7_000_000),
  ]) await assert.rejects(validateAndNormalizeImage(value));
});

test('OCR budget enforces concurrency, cooldown, daily limits and UTC rollover', () => {
  const budget = createOcrBudget(2, 1000);
  const release = budget.reserve(0);
  assert.ok(release);
  assert.equal(budget.reserve(2000), null);
  release();
  assert.equal(budget.reserve(999), null);
  const second = budget.reserve(1000);
  assert.ok(second);
  release(); // An old release cannot clear a newer active reservation.
  assert.equal(budget.reserve(2000), null);
  second();
  assert.equal(budget.reserve(3000), null);
  assert.ok(budget.reserve(86_400_000));
});

test('comparison refuses adversarial token counts before allocating its alignment table', () => {
  assert.throws(() => compareText('x'.repeat(10_001), []), /too complex/);
  assert.throws(() => compareText('a', [{ text: '!'.repeat(1501) }]), /too complex/);
  assert.equal(compareText('Hello', [{ text: 'Hello' }]).differences.spelling.length, 0);
});

test('direct server-action calls cannot bypass access or image validation', async () => {
  const previous = process.env.OCR_ACCESS_KEY;
  try {
    delete process.env.OCR_ACCESS_KEY;
    const disabled = await performOcr({ referenceImage: 'not-an-image', accessKey });
    assert.equal(disabled.ocrResult, null);
    assert.match(disabled.error ?? '', /unavailable/);
    process.env.OCR_ACCESS_KEY = accessKey;
    const unauthorized = await performOcr({ referenceImage: 'not-an-image', accessKey: 'wrong'.repeat(16) });
    assert.match(unauthorized.error ?? '', /invalid/);
    const malformed = await performOcr({ referenceImage: 'not-an-image', accessKey });
    assert.equal(malformed.ocrResult, null);
    assert.match(malformed.error ?? '', /valid PNG or JPEG/);
    assert.equal(JSON.stringify(malformed).includes(accessKey), false);
  } finally {
    if (previous === undefined) delete process.env.OCR_ACCESS_KEY;
    else process.env.OCR_ACCESS_KEY = previous;
  }
});
