/** Real PDF fixture render test; no gateway or database calls. */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderPdfPages } from '../src/reader/render.js';
import { InvalidDocumentError } from '../src/reader/errors.js';

describe('renderPdfPages', () => {
  it('marks malformed PDF as a permanent document error', async () => {
    await expect(renderPdfPages(Buffer.from('not a pdf'))).rejects.toBeInstanceOf(InvalidDocumentError);
  });

  it('renders no more than two fixture pages within 1280px bounds', async () => {
    const pdf = await readFile(resolve(process.cwd(), '../../data/testset/cases/c007_foto_hp_miring.pdf'));
    const pages = await renderPdfPages(pdf);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.length).toBeLessThanOrEqual(2);
    for (const page of pages) {
      const metadata = await sharp(page).metadata();
      expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(1280);
      expect(metadata.format).toBe('png');
    }
  });
});
