/** Render at most two PDF pages and constrain the longest side to 1280px. */

import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import sharp from 'sharp';
import { InvalidDocumentError } from './errors.js';

export async function renderPdfPages(pdf: Buffer): Promise<Buffer[]> {
  try {
    const bytes = new Uint8Array(pdf);
    const document = await getDocumentProxy(bytes);
    const pages: Buffer[] = [];
    const count = Math.min(document.numPages, 2);
    for (let page = 1; page <= count; page += 1) {
      const rendered = await renderPageAsImage(document, page, {
        scale: 1.5,
        canvasImport: () => import('@napi-rs/canvas'),
      });
      const resized = await sharp(Buffer.from(rendered))
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      pages.push(resized);
    }
    if (pages.length === 0) throw new Error('PDF tidak memiliki halaman.');
    return pages;
  } catch {
    throw new InvalidDocumentError();
  }
}
