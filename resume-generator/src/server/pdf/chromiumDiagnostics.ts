import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

/**
 * ============================================================================
 * TEMPORARY DIAGNOSTIC INSTRUMENTATION — NOT PART OF THE PERMANENT ARCHITECTURE
 * ============================================================================
 *
 * Purpose: gather runtime evidence directly from the deployed Vercel Function
 * to distinguish between the two remaining hypotheses for the
 * "libnss3.so: cannot open shared object file" failure:
 *
 *   (A) PACKAGING — the @sparticuz/chromium native payload (binary + its
 *       shared libraries) was not correctly included in the bundle that
 *       Vercel actually deployed for this Function.
 *   (B) RUNTIME INCOMPATIBILITY — the payload was bundled and extracted to
 *       /tmp correctly, but the resulting /tmp/chromium binary (or one of
 *       its shared-library dependencies) is incompatible with the actual
 *       Linux environment the Function executes in.
 *
 * Every check below is read-only (filesystem stats/listings, and — only if
 * available in the runtime — the read-only tools `ldd`/`file`). Nothing is
 * installed, nothing is written, no environment variables/secrets/user data
 * are logged. Every step is independently wrapped so a failure in one check
 * never prevents the others from running or affects the real PDF generation
 * flow that calls this module.
 *
 * REMOVE THIS FILE — and its single call site in pdfGenerator.ts — once the
 * root cause has been confirmed from real Vercel logs.
 * ============================================================================
 */

function safeLog(label: string, fn: () => unknown): void {
  try {
    const result = fn();
    console.log(`[chromium-diagnostics] ${label} ->`, JSON.stringify(result));
  } catch (error) {
    console.log(
      `[chromium-diagnostics] ${label} -> CHECK FAILED:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/** Shallow, bounded directory listing. Never reads file contents. */
function listDir(dirPath: string, maxEntries = 60): string[] {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .slice(0, maxEntries)
    .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
}

/** Depth- and result-bounded recursive filename search. Never reads file contents. */
function findFile(rootPath: string, targetName: string, maxDepth: number, maxResults: number): string[] {
  const results: string[] = [];

  function walk(currentPath: string, depth: number): void {
    if (results.length >= maxResults || depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.name === targetName) {
        results.push(fullPath);
      }
    }
  }

  walk(rootPath, 0);
  return results;
}

/**
 * Runs a read-only diagnostic command without ever throwing. If the tool
 * does not exist in the runtime, that fact is reported explicitly instead
 * of being silently swallowed or an outcome being invented.
 */
function runReadOnlyCommand(command: string, args: string[]): unknown {
  const result = spawnSync(command, args, { encoding: 'utf-8', timeout: 5000 });

  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return `TOOL NOT AVAILABLE in this runtime (${command}): ${result.error.message}`;
    }
    return `TOOL FAILED TO RUN (${command}): ${result.error.message}`;
  }

  return {
    exitStatus: result.status,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

export function runChromiumDiagnostics(executablePath: string): void {
  console.log('[chromium-diagnostics] ==== START (temporary instrumentation) ====');

  safeLog('process.version', () => process.version);
  safeLog('process.platform', () => process.platform);
  safeLog('process.arch', () => process.arch);
  safeLog('process.cwd()', () => process.cwd());
  safeLog('executablePath from chromium.executablePath()', () => executablePath);

  const exists = fs.existsSync(executablePath);
  safeLog('fs.existsSync(executablePath)', () => exists);

  if (exists) {
    safeLog('fs.statSync(executablePath)', () => {
      const stat = fs.statSync(executablePath);
      return {
        sizeBytes: stat.size,
        mode: (stat.mode & 0o777).toString(8),
        isFile: stat.isFile(),
      };
    });
  }

  safeLog('listing of dirname(executablePath)', () => listDir(path.dirname(executablePath)));

  safeLog('/tmp entries matching /chrom/i (filtered, not a full dump)', () =>
    fs.readdirSync('/tmp').filter((name) => /chrom/i.test(name))
  );

  safeLog('@sparticuz/chromium package location + top-level contents as deployed', () => {
    const pkgEntry = require.resolve('@sparticuz/chromium');
    const pkgDir = path.dirname(pkgEntry);
    return { pkgEntry, pkgDir, topLevel: listDir(pkgDir) };
  });

  safeLog('search for libnss3.so under dirname(executablePath) [depth<=3]', () =>
    findFile(path.dirname(executablePath), 'libnss3.so', 3, 5)
  );

  safeLog('search for libnss3.so under the @sparticuz/chromium package dir [depth<=4]', () => {
    const pkgDir = path.dirname(require.resolve('@sparticuz/chromium'));
    return findFile(pkgDir, 'libnss3.so', 4, 5);
  });

  safeLog('ldd(executablePath) — lists dynamic deps and whether each resolves', () =>
    runReadOnlyCommand('ldd', [executablePath])
  );

  safeLog('file(executablePath) — identifies the ELF/binary type', () =>
    runReadOnlyCommand('file', [executablePath])
  );

  console.log('[chromium-diagnostics] ==== END (temporary instrumentation) ====');
}
