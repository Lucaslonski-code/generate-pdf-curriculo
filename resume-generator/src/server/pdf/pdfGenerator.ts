import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';
import { runChromiumDiagnostics } from './chromiumDiagnostics';

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

      // TEMPORARY DIAGNOSTIC INSTRUMENTATION — see chromiumDiagnostics.ts.
      // Collects read-only runtime evidence (env facts, filesystem state,
      // ldd/file output when available) to determine whether the Chromium
      // payload was bundled/extracted correctly or is OS-incompatible.
      // Remove this call (and the chromiumDiagnostics.ts file) once the
      // root cause has been confirmed from real Vercel Function logs.
      runChromiumDiagnostics(executablePath);

      try {
        return await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath,
          // @sparticuz/chromium's `headless` getter can return the literal
          // "new" — the flag older Puppeteer versions used to opt into the
          // new headless renderer. The installed puppeteer-core (22.x)
          // already defaults to that same renderer and only accepts
          // `boolean | "shell" | undefined`; "new" is no longer a valid
          // literal there. Normalizing "new" to `true` keeps the exact same
          // intent (use the new headless mode) while satisfying the actual
          // installed type.
          headless: chromium.headless === 'new' ? true : chromium.headless,
          // TEMPORARY: pipes the browser subprocess's own stdout/stderr into
          // this Function's logs. This can surface the dynamic linker's full
          // complaint (possibly more than just libnss3.so) instead of only
          // the summarized message Puppeteer itself throws. Safe to remove
          // once diagnosis is complete — it does not change PDF output.
          dumpio: true,
        });
      } catch (error) {
        // TEMPORARY DIAGNOSTIC LOGGING ONLY. The error below is logged in
        // full and then re-thrown completely unchanged on the next line —
        // this does not alter the function's behavior or response in any
        // way; it only makes the existing failure more visible in logs.
        console.error('[chromium-diagnostics] puppeteer.launch() threw. Full error follows:');
        console.error('[chromium-diagnostics] error.message:', error instanceof Error ? error.message : error);
        console.error(
          '[chromium-diagnostics] error.stack:',
          error instanceof Error ? error.stack : '(not an Error instance)'
        );
        throw error;
      }
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
