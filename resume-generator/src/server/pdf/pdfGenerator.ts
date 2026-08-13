import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';
import { runChromiumDiagnostics } from './chromiumDiagnostics';
import { ensureNssLibrariesExtracted } from './chromiumNssFix';

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

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const cached = await browserPromise;
    if (cached.isConnected()) {
      return cached;
    }
    // The cached browser's underlying OS process died after it was
    // launched (e.g. the SIGTRAP crash this fix addresses, or any other
    // reason) — direct evidence showed a later request in the same warm
    // container reusing this stale reference and failing immediately on
    // browser.newPage() with "Protocol error: Connection closed". Discard
    // the cache and relaunch instead of handing out a dead browser.
    //
    // Known narrow edge case: if two requests hit this branch concurrently,
    // both may relaunch independently (the second overwrites browserPromise
    // and the first launch leaks). Not addressed here — out of scope for
    // this fix and unrelated to the crash under investigation.
    console.error('[chromium-diagnostics] cached browser is no longer connected — relaunching');
    browserPromise = null;
  }

  browserPromise = (async () => {
    const executablePath = await chromium.executablePath();

    // PERMANENT FIX — see chromiumNssFix.ts for the full root-cause
    // explanation. @sparticuz/chromium's own extraction of the NSS
    // library archive (bin/al2023.tar.br or bin/al2.tar.br) does not
    // run in this environment; this performs that extraction directly
    // so libnss3.so and its siblings exist before launch() is attempted.
    ensureNssLibrariesExtracted(executablePath);

    // TEMPORARY DIAGNOSTIC INSTRUMENTATION — see chromiumDiagnostics.ts.
    // Collects read-only runtime evidence (env facts, filesystem state,
    // ldd/file output when available) to determine whether the Chromium
    // payload was bundled/extracted correctly or is OS-incompatible.
    // Remove this call (and the chromiumDiagnostics.ts file) once the
    // fix above has been confirmed from real Vercel Function logs.
    runChromiumDiagnostics(executablePath);

    // TEMPORARY DIAGNOSTIC: we have been trusting chromium.args blindly
    // since the beginning — never actually logged what's in it. These
    // are just CLI flags (no secrets), safe to log in full.
    console.log('[chromium-diagnostics] chromium.args ->', JSON.stringify(chromium.args));
    console.log('[chromium-diagnostics] chromium.defaultViewport ->', JSON.stringify(chromium.defaultViewport));

    try {
      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          // FIX v2, based on new direct evidence that DISPROVED the v1
          // attempt below: overriding to `--use-gl=swiftshader` alone
          // caused Chromium to log "Requested GL implementation
          // (gl=none,angle=none) not found" (that value isn't valid on
          // its own in this Chromium version) — and it STILL crashed
          // with the exact same `SIGTRAP`. That rules out "wrong GL
          // backend" as the cause, since changing it changed nothing.
          //
          // With that broken value in place, the logs also showed the
          // actual failure for the first time: repeated Chromium
          // `CHECK failed: false. NOTREACHED` assertions in
          // gpu_channel_manager.cc ("Failed to create GLES3 context",
          // "Failed to create shared context for virtualization",
          // "unable to create context") immediately before the crash.
          // A failed CHECK() is Chromium intentionally crashing itself
          // via SIGTRAP — this is the real root cause: GPU context
          // creation itself is failing in this environment (likely due
          // to `--single-process --in-process-gpu` combined with no
          // real GPU), and Chromium treats that as fatal.
          //
          // Headless PDF generation does not need GPU acceleration at
          // all, so the robust fix is to skip GPU usage entirely rather
          // than pick a specific (and apparently fragile) GPU backend.
          '--disable-gpu',
        ],
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

      // TEMPORARY DIAGNOSTIC: "Protocol error: Connection closed" only
      // tells us the CDP connection died, not why the underlying OS
      // process exited. Attaching directly to the real child process
      // gives us its actual exit code / signal — e.g. SIGKILL strongly
      // indicates the container's OOM killer, vs SIGSEGV indicating an
      // actual crash in Chromium itself. This is the most direct,
      // unambiguous evidence available short of a core dump.
      const childProcess = browser.process();
      if (childProcess) {
        childProcess.on('exit', (code, signal) => {
          console.error(
            `[chromium-diagnostics] chromium child process "exit": code=${code} signal=${signal}`
          );
        });
        childProcess.on('close', (code, signal) => {
          console.error(
            `[chromium-diagnostics] chromium child process "close": code=${code} signal=${signal}`
          );
        });
      } else {
        console.error('[chromium-diagnostics] browser.process() returned null — cannot attach exit listeners');
      }

      return browser;
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

  // TEMPORARY DIAGNOSTIC LISTENERS. The generic "Protocol error: Connection
  // closed" seen when page.close() fails after a browser/page crash gives
  // no information about what actually crashed it. These surface whatever
  // Puppeteer does expose about that failure, in the same Function logs.
  page.on('error', (error) => {
    console.error('[chromium-diagnostics] page "error" event (renderer process crashed):', error.message);
  });
  page.on('pageerror', (error) => {
    console.error('[chromium-diagnostics] page "pageerror" event (uncaught exception in page context):', error);
  });
  page.on('console', (msg) => {
    console.log('[chromium-diagnostics] page console message:', msg.type(), msg.text());
  });
  browser.on('disconnected', () => {
    console.error('[chromium-diagnostics] browser "disconnected" event fired');
  });

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
    // If setContent()/pdf() above threw because the browser/page had
    // already crashed, page.close() here can ALSO throw ("Protocol error:
    // Connection closed..."). Left uncaught, that would silently replace
    // the original, more informative error (standard JS try/finally
    // behavior: an exception from `finally` overrides one from `try`).
    // Catching and only logging it here guarantees the real error is
    // always what the caller — and the logs — actually see.
    try {
      await page.close();
    } catch (closeError) {
      console.error(
        '[chromium-diagnostics] page.close() also failed (this is a symptom, not the root cause):',
        closeError instanceof Error ? closeError.message : closeError
      );
    }
  }
}
