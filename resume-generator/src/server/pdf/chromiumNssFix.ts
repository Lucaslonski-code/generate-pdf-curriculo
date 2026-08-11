import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * ============================================================================
 * PERMANENT FIX — works around a missing extraction step in @sparticuz/chromium
 * ============================================================================
 *
 * @sparticuz/chromium ships the OS-specific NSS/NSPR/expat shared libraries
 * (libnss3.so, libnssutil3.so, libnspr4.so, libexpat.so.1) as two separate
 * brotli-compressed tar archives inside its own package, alongside the
 * Chromium binary itself:
 *
 *   node_modules/@sparticuz/chromium/bin/al2.tar.br      (Amazon Linux 2)
 *   node_modules/@sparticuz/chromium/bin/al2023.tar.br   (Amazon Linux 2023)
 *   node_modules/@sparticuz/chromium/bin/chromium.br
 *   node_modules/@sparticuz/chromium/bin/fonts.tar.br
 *   node_modules/@sparticuz/chromium/bin/swiftshader.tar.br
 *
 * The package's own `chromium.executablePath()` call is responsible for
 * choosing one of the two OS-specific archives and extracting it into the
 * same /tmp directory as the Chromium binary. Runtime evidence collected
 * from this deployment (Vercel Function logs) confirmed:
 *
 *   - chromium.br, fonts.tar.br and swiftshader.tar.br ARE extracted
 *     correctly (the binary, fonts/, libEGL.so, libGLESv2.so,
 *     libvk_swiftshader.so, libvulkan.so.1 all appear in /tmp);
 *   - neither al2.tar.br nor al2023.tar.br is ever extracted — libnss3.so
 *     and its siblings are absent from /tmp, from the package's `bin/`
 *     listing search, and everywhere else searched;
 *   - this is consistent across two different @sparticuz/chromium versions
 *     (123.0.1 and 119.0.2), ruling out a version-specific bug.
 *
 * This function performs that specific extraction ourselves — independent
 * of whatever internal condition the package uses to decide (and skip) it
 * in this environment — so the browser can launch regardless of why that
 * step doesn't run here. It writes files flat into the same directory as
 * the Chromium binary (matching where the other extracted libraries land),
 * which is where the binary's own embedded rpath looks for them.
 *
 * It is idempotent and cheap to call on every cold start: a no-op once
 * libnss3.so is already present (extracted by this function, or — should a
 * future package version fix the underlying issue — by the package itself).
 */

const REGULAR_FILE_TYPEFLAGS = new Set(['0', '\0']);
const TAR_BLOCK_SIZE = 512;

interface TarEntry {
  name: string;
  typeFlag: string;
  content: Buffer;
}

/**
 * Minimal POSIX/ustar tar reader: just enough to walk a flat archive of
 * regular files and directories. Does not handle GNU long-name extension
 * entries, which these specific archives (short filenames like
 * "libnss3.so") don't use.
 */
function parseTar(buffer: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + TAR_BLOCK_SIZE);
    if (header.every((byte) => byte === 0)) break; // end-of-archive marker

    const name = header.subarray(0, 100).toString('utf-8').replace(/\0.*$/, '');
    const sizeField = header.subarray(124, 136).toString('utf-8').replace(/\0.*$/, '').trim();
    const size = sizeField ? parseInt(sizeField, 8) : 0;
    const typeFlag = String.fromCharCode(header[156]);

    offset += TAR_BLOCK_SIZE;
    const content = buffer.subarray(offset, offset + size);
    entries.push({ name, typeFlag, content });
    offset += Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
  }

  return entries;
}

/** Walks up from a file inside a package until it finds that package's own package.json (its root). */
function findPackageRoot(startFile: string): string {
  let dir = path.dirname(startFile);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.dirname(startFile);
}

function extractArchive(archivePath: string, targetDir: string): number {
  const compressed = fs.readFileSync(archivePath);
  const tarBuffer = zlib.brotliDecompressSync(compressed);
  const entries = parseTar(tarBuffer);

  let extractedCount = 0;
  for (const entry of entries) {
    if (!REGULAR_FILE_TYPEFLAGS.has(entry.typeFlag)) continue;
    const baseName = path.basename(entry.name);
    if (!baseName) continue;

    const targetPath = path.join(targetDir, baseName);
    fs.writeFileSync(targetPath, entry.content);
    fs.chmodSync(targetPath, 0o755);
    extractedCount++;
  }
  return extractedCount;
}

/**
 * Ensures libnss3.so (and its siblings) exist next to the Chromium binary,
 * extracting them ourselves from the package's own bin/al2023.tar.br (or
 * bin/al2.tar.br as a fallback) if they're missing. Safe to call on every
 * cold start — no-ops once the libraries are already present.
 */
export function ensureNssLibrariesExtracted(executablePath: string): void {
  const targetDir = path.dirname(executablePath);
  const nssMarker = path.join(targetDir, 'libnss3.so');

  if (fs.existsSync(nssMarker)) {
    return;
  }

  let pkgRoot: string;
  try {
    pkgRoot = findPackageRoot(require.resolve('@sparticuz/chromium'));
  } catch (error) {
    console.error(
      '[chromium-nss-fix] could not resolve @sparticuz/chromium package root:',
      error instanceof Error ? error.message : error
    );
    return;
  }

  // AL2023 is the current-generation Amazon Linux build; AL2 is kept as a
  // fallback in case the actual runtime turns out to be the older base.
  const candidates = ['al2023.tar.br', 'al2.tar.br'];

  for (const archiveName of candidates) {
    const archivePath = path.join(pkgRoot, 'bin', archiveName);
    if (!fs.existsSync(archivePath)) {
      console.log(`[chromium-nss-fix] bin/${archiveName} not found in package, skipping`);
      continue;
    }

    try {
      const extractedCount = extractArchive(archivePath, targetDir);
      console.log(`[chromium-nss-fix] extracted ${extractedCount} file(s) from bin/${archiveName} into ${targetDir}`);

      if (fs.existsSync(nssMarker)) {
        console.log('[chromium-nss-fix] libnss3.so now present — extraction succeeded');
        return;
      }
      console.log(`[chromium-nss-fix] bin/${archiveName} extracted but libnss3.so still missing, trying next candidate`);
    } catch (error) {
      console.error(
        `[chromium-nss-fix] failed to extract bin/${archiveName}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.error(
    '[chromium-nss-fix] libnss3.so still missing after attempting all candidate archives (al2023, al2).'
  );
}
