import type { Browser } from 'puppeteer-core';
import fs from 'fs';
import { runChromiumDiagnostics } from './chromiumDiagnostics';
import { ensureNssLibrariesExtracted } from './chromiumNssFix';

const PAGE_LOAD_TIMEOUT_MS = 15_000;

let browserPromise: Promise<Browser> | null = null;

async function findLocalChromePath(): Promise<string> {
  if (process.platform === 'win32') {
    const candidates = [
      `${process.env['PROGRAMFILES']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`,
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
  } else if (process.platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macPath)) return macPath;
  } else {
    const { execSync } = await import('child_process');
    try {
      return execSync('which chromium-browser || which chromium || which google-chrome', {
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
    } catch {
      // not found
    }
  }
  throw new Error(
    'Google Chrome not found. Install Chrome or set the CHROME_PATH environment variable.',
  );
}

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
    const puppeteerCore = await import('puppeteer-core');
    const puppeteer = puppeteerCore.default ?? puppeteerCore;

    let executablePath: string;
    let launchArgs: string[];
    let defaultViewport: {
      width: number;
      height: number;
      deviceScaleFactor: number;
      isMobile: boolean;
      hasTouch: boolean;
      isLandscape: boolean;
    };
    let headless: boolean | 'shell' | undefined;

    const isVercel = !!process.env.VERCEL;
    const isLinux = process.platform === 'linux';

    if (isVercel || isLinux) {
      const chromiumModule = await import('@sparticuz/chromium');
      const chromium = chromiumModule.default ?? chromiumModule;

      chromium.setGraphicsMode = false;

      executablePath = await chromium.executablePath();

      ensureNssLibrariesExtracted(executablePath);
      runChromiumDiagnostics(executablePath);

      launchArgs = chromium.args.filter((arg) => !arg.startsWith('--headless'));

      defaultViewport = chromium.defaultViewport;
      headless = 'shell';
    } else {
      executablePath = await findLocalChromePath();
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
      defaultViewport = {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true,
      };
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
            `[chromium-diagnostics] chromium child process "exit": code=${code} signal=${signal}`,
          );
        });
        childProcess.on('close', (code, signal) => {
          console.error(
            `[chromium-diagnostics] chromium child process "close": code=${code} signal=${signal}`,
          );
        });
      } else {
        console.error(
          '[chromium-diagnostics] browser.process() returned null — cannot attach exit listeners',
        );
      }

      return browser;
    } catch (error) {
      console.error('[chromium-diagnostics] puppeteer.launch() threw. Full error follows:');
      console.error(
        '[chromium-diagnostics] error.message:',
        error instanceof Error ? error.message : error,
      );
      console.error(
        '[chromium-diagnostics] error.stack:',
        error instanceof Error ? error.stack : '(not an Error instance)',
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
    console.error(
      '[chromium-diagnostics] page "error" event (renderer process crashed):',
      error.message,
    );
  });
  page.on('pageerror', (error) => {
    console.error(
      '[chromium-diagnostics] page "pageerror" event (uncaught exception in page context):',
      error,
    );
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
        closeError instanceof Error ? closeError.message : closeError,
      );
    }
  }
}
