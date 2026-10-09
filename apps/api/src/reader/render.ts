/** Render at most two PDF pages and constrain the longest side to 1280px. */

import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import sharp from 'sharp';

export async function renderPdfPages(pdf: Buffer): Promise<Buffer[]> {
  const document = await getDocumentProxy(pdf);
  const pages: Buffer[] = [];
  const count = Math.min(document.numPages, 2);
  for (let page = 1; page <= count; page += 1) {
    const rendered = await renderPageAsImage(pdf, page, { scale: 1.5 });
    const resized = await sharp(Buffer.from(rendered))
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    pages.push(resized);
  }
  return pages;
}
