import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';

const PAGE_LOAD_TIMEOUT_MS = 15_000;

/**
 * Vercel Serverless Functions run in a Node.js Lambda-style environment:
 * there is no system Chrome installed, and the deployed function bundle
 * has a strict size budget that the full `puppeteer` package (which
 * bundles a ~300MB browser download) does not fit into.
 *
 * `puppeteer-core` ships no browser at all, and `@sparticuz/chromium`
 * provides a Chromium build compressed specifically to fit that budget,
 * unpacked to /tmp on cold start — no network download, no install step,
 * no reliance on a cached or locally installed browser.
 *
 * The same container is reused across consecutive ("warm") invocations of
 * the same function, so — exactly like the previous long-running-server
 * version — a single Chromium instance is launched lazily and reused for
 * the lifetime of the container; each request only opens/closes its own
 * `page`, which is cheap.
 */
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const executablePath = await chromium.executablePath();
      return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
      });
    })();
  }
  return browserPromise;
}

/**
 * Renders an HTML document into a print-quality A4 PDF buffer.
 *
 * - `waitUntil: 'networkidle0'` ensures Google Fonts (loaded via @import
 *   in the template CSS) have finished loading before the page is
 *   rasterized, avoiding a flash of fallback fonts in the PDF. A bounded
 *   `timeout` keeps a flaky network from hanging the request indefinitely.
 * - Margins are applied here (rather than via `@page` in CSS) so every
 *   template gets consistent, professional spacing regardless of its
 *   own styling choices.
 * - `printBackground: true` preserves subtle background colors (e.g.
 *   skill tags) that would otherwise be stripped in print output.
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: PAGE_LOAD_TIMEOUT_MS });

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '18mm',
        bottom: '16mm',
        left: '16mm',
        right: '16mm',
      },
    });

    return Buffer.from(pdfBytes);
  } finally {
    await page.close();
  }
}
