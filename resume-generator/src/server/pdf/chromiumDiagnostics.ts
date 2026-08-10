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

/** Walks up from a file inside a package until it finds that package's own package.json (its root). */
function findPackageRoot(startFile: string): string {
  let dir = path.dirname(startFile);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.dirname(startFile);
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

  safeLog('@sparticuz/chromium: entry file resolved by require.resolve()', () => require.resolve('@sparticuz/chromium'));

  safeLog('@sparticuz/chromium package ROOT (walked up to nearest package.json) + full top-level listing', () => {
    const pkgEntry = require.resolve('@sparticuz/chromium');
    const pkgRoot = findPackageRoot(pkgEntry);
    return { pkgEntry, pkgRoot, topLevel: listDir(pkgRoot, 200) };
  });

  safeLog('@sparticuz/chromium package.json — name/version/scripts (public metadata, no secrets)', () => {
    const pkgEntry = require.resolve('@sparticuz/chromium');
    const pkgRoot = findPackageRoot(pkgEntry);
    const raw = fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { name?: string; version?: string; scripts?: Record<string, string> };
    return { name: parsed.name, version: parsed.version, scripts: parsed.scripts ?? {} };
  });

  safeLog('@sparticuz/chromium package ROOT /bin — full contents (name + size, no content read)', () => {
    const pkgEntry = require.resolve('@sparticuz/chromium');
    const pkgRoot = findPackageRoot(pkgEntry);
    const binDir = path.join(pkgRoot, 'bin');
    if (!fs.existsSync(binDir)) return 'bin/ does not exist under package root';
    const entries = fs.readdirSync(binDir, { withFileTypes: true });
    return entries.map((entry) => {
      if (entry.isDirectory()) return { name: `${entry.name}/`, type: 'dir' };
      const stat = fs.statSync(path.join(binDir, entry.name));
      return { name: entry.name, type: 'file', sizeBytes: stat.size };
    });
  });

  safeLog('search for libnss3.so under dirname(executablePath) [depth<=3]', () =>
    findFile(path.dirname(executablePath), 'libnss3.so', 3, 5)
  );

  safeLog(
    'search for libnss3.so under the @sparticuz/chromium package ROOT (not just build/) [depth<=6]',
    () => {
      const pkgEntry = require.resolve('@sparticuz/chromium');
      const pkgRoot = findPackageRoot(pkgEntry);
      return findFile(pkgRoot, 'libnss3.so', 6, 10);
    }
  );

  safeLog('ldd(executablePath) — lists dynamic deps and whether each resolves', () =>
    runReadOnlyCommand('ldd', [executablePath])
  );

  safeLog('file(executablePath) — identifies the ELF/binary type', () =>
    runReadOnlyCommand('file', [executablePath])
  );

  console.log('[chromium-diagnostics] ==== END (temporary instrumentation) ====');
}
