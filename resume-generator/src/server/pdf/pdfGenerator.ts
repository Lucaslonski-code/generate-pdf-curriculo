import { Browser } from 'puppeteer-core';
import { runChromiumDiagnostics } from './chromiumDiagnostics';
import { ensureNssLibrariesExtracted } from './chromiumNssFix';

const PAGE_LOAD_TIMEOUT_MS = 15_000;

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const cached = await browserPromise;
    if (cached.isConnected()) {
      return cached;
    }
    console.error('[chromium-diagnostics] cached browser is no longer connected — relaunching');
    browserPromise = null;
  }

  browserPromise = (async () => {
    let puppeteer: typeof import('puppeteer-core');
    let chromium: typeof import('@sparticuz/chromium');
    let executablePath: string;
    let launchArgs: string[];
    let defaultViewport: { width: number; height: number; deviceScaleFactor: number; isMobile: boolean; hasTouch: boolean; isLandscape: boolean };
    let headless: boolean | 'shell' | undefined;

    const isVercel = !!process.env.VERCEL;
    const isLinux = process.platform === 'linux';

    if (isVercel || isLinux) {
      const chromiumModule = await import('@sparticuz/chromium');
      chromium = chromiumModule;
      const puppeteerCoreModule = await import('puppeteer-core');
      puppeteer = puppeteerCoreModule;

      executablePath = await chromium.executablePath();

      ensureNssLibrariesExtracted(executablePath);
      runChromiumDiagnostics(executablePath);

      console.log('[chromium-diagnostics] chromium.args ->', JSON.stringify(chromium.args));
      console.log('[chromium-diagnostics] chromium.defaultViewport ->', JSON.stringify(chromium.defaultViewport));

      const GPU_FORCING_FLAGS = new Set([
        '--ignore-gpu-blocklist',
        '--in-process-gpu',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ]);

      launchArgs = chromium.args.filter(
        (arg) => !GPU_FORCING_FLAGS.has(arg) && !arg.startsWith('--headless')
      );
      launchArgs.push('--disable-gpu', '--disable-software-rasterizer');
      console.log('[chromium-diagnostics] launchArgs (GPU-forcing + malformed --headless removed) ->', JSON.stringify(launchArgs));

      defaultViewport = chromium.defaultViewport;
      headless = chromium.headless === 'new' ? true : chromium.headless;
    } else {
      const puppeteerModule = await import('puppeteer');
      puppeteer = puppeteerModule.default ?? puppeteerModule;

      executablePath = await puppeteer.executablePath();
      launchArgs = [
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ];
      defaultViewport = { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: true };
      headless = true;
    }

    try {
      const browser = await puppeteer.launch({
        args: launchArgs,
        defaultViewport,
        executablePath,
        headless,
        dumpio: true,
        protocolTimeout: 120000,
      });

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

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

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