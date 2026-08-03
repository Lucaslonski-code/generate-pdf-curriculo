import { EntryBlock, SectionContent, SectionType } from './types';

const BULLET_PATTERN = /^[-•*–]\s*/;
const DATE_HINT_PATTERN = /\d{4}|atual|presente|current|hoje|now/i;
// A date/period line ("Jan 2022 - Atual") is always short; anything longer
// is more likely a description sentence that happens to mention a year.
const MAX_META_LINE_LENGTH = 80;

/** Splits a block of lines into groups separated by blank lines. */
function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    blocks.push(current);
  }
  return blocks;
}

function stripBullet(line: string): string {
  return line.trim().replace(BULLET_PATTERN, '').trim();
}

/** Picks the delimiter used to pack multiple items onto a single line, if any. */
function detectInlineSeparator(line: string): string | null {
  if (line.includes('|')) return '|';
  if (line.includes(',')) return ',';
  return null;
}

/**
 * Builds a "list" section (skills, languages, certifications).
 * Accepts bullet lists, one-item-per-line, or comma/pipe separated lines.
 */
export function buildListContent(lines: string[]): SectionContent {
  const items: string[] = [];

  for (const rawLine of lines) {
    const line = stripBullet(rawLine);
    if (!line) continue;

    const separator = detectInlineSeparator(line);

    if (separator) {
      line
        .split(separator)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => items.push(part));
    } else {
      items.push(line);
    }
  }

  return { kind: 'list', items };
}

/**
 * Builds a single entry (e.g. one job or one degree) from a block of lines.
 * Heuristic: first line is the title, an optional second line that looks
 * like a date range becomes the meta line, remaining bullet lines become
 * bullet points and remaining plain lines become description paragraphs.
 */
function buildEntry(blockLines: string[]): EntryBlock {
  const [firstLine, secondLine, ...rest] = blockLines;
  const title = stripBullet(firstLine ?? '');

  let meta: string | undefined;
  let remaining = secondLine !== undefined ? [secondLine, ...rest] : [];

  const secondLineLooksLikeMeta =
    secondLine !== undefined &&
    !BULLET_PATTERN.test(secondLine.trim()) &&
    DATE_HINT_PATTERN.test(secondLine) &&
    secondLine.trim().length <= MAX_META_LINE_LENGTH;

  if (secondLineLooksLikeMeta) {
    meta = secondLine.trim();
    remaining = rest;
  }

  const bullets: string[] = [];
  const description: string[] = [];

  for (const line of remaining) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (BULLET_PATTERN.test(trimmed)) {
      bullets.push(stripBullet(trimmed));
    } else {
      description.push(trimmed);
    }
  }

  return { title, meta, description, bullets };
}

/** Builds an "entries" section (experience, projects, education). */
export function buildEntriesContent(lines: string[]): SectionContent {
  const entries = splitBlocks(lines).map(buildEntry);
  return { kind: 'entries', entries };
}

/** Builds a free-form "text" section (summary and unrecognized sections). */
export function buildTextContent(lines: string[]): SectionContent {
  const paragraphs = splitBlocks(lines).map((block) =>
    block.map(stripBullet).filter(Boolean).join(' ')
  );
  return { kind: 'text', paragraphs: paragraphs.filter(Boolean) };
}

const LIST_TYPES: SectionType[] = ['skills', 'certifications', 'languages'];
const ENTRY_TYPES: SectionType[] = ['experience', 'projects', 'education'];

/** Dispatches to the correct content builder based on the section type. */
export function buildSectionContent(type: SectionType, lines: string[]): SectionContent {
  if (LIST_TYPES.includes(type)) return buildListContent(lines);
  if (ENTRY_TYPES.includes(type)) return buildEntriesContent(lines);
  return buildTextContent(lines);
}
