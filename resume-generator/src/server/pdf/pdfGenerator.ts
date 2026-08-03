import puppeteer, { Browser } from 'puppeteer';

const PAGE_LOAD_TIMEOUT_MS = 15_000;

/**
 * Launching a fresh Chromium process per PDF (the previous implementation)
 * costs several hundred ms to ~1s of pure startup overhead on every
 * request. A single instance is launched lazily on first use and reused
 * for the lifetime of the process; each request only opens/closes its
 * own `page`, which is cheap.
 *
 * `--no-sandbox` / `--disable-setuid-sandbox` are required to run Chromium
 * inside most containerized environments (Docker, CI). If you deploy this
 * outside a container, prefer running the process as a non-root user over
 * disabling the sandbox.
 */
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserPromise;
}

/** Closes the shared browser instance. Call once during graceful shutdown. */
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
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
